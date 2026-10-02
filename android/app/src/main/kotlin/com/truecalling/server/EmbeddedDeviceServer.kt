package com.truecalling.server

import android.util.Base64
import android.util.Log
import org.json.JSONObject
import java.io.InputStream
import java.io.OutputStream
import java.net.ServerSocket
import java.net.Socket
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class EmbeddedDeviceServer(
    val port: Int = 45455,
    private val onCallInviteReceived: (JSONObject) -> Unit
) {
    private var serverSocket: ServerSocket? = null
    @Volatile
    private var isRunning = false
    private val threadPool = Executors.newCachedThreadPool()

    var deviceId: String = "android-${System.currentTimeMillis()}"
    var displayName: String = "Android Device"
    var status: String = "available"
    var currentRoomName: String? = null
    var roomDetailsJson: JSONObject? = null

    // Connected WebSocket signaling clients
    private val wsClients = ConcurrentHashMap<String, WebSocketClientHandler>()

    fun start() {
        if (isRunning) return
        isRunning = true
        Thread {
            try {
                serverSocket = ServerSocket(port).apply {
                    reuseAddress = true
                }
                Log.d("TrueCallingServer", "Embedded HTTP & Signaling server listening on port $port")
                while (isRunning) {
                    val client = serverSocket?.accept() ?: break
                    threadPool.execute { handleClient(client) }
                }
            } catch (e: Exception) {
                if (isRunning) Log.e("TrueCallingServer", "Server exception", e)
            }
        }.start()
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {}
        serverSocket = null

        wsClients.values.forEach { it.close() }
        wsClients.clear()
    }

    private fun handleClient(socket: Socket) {
        try {
            val input = socket.getInputStream()
            val out = socket.getOutputStream()

            // Read HTTP request line and headers
            val headers = mutableMapOf<String, String>()
            var requestLine = ""
            val headerSb = StringBuilder()

            var prev = -1
            while (true) {
                val b = input.read()
                if (b == -1) return
                headerSb.append(b.toChar())
                if (prev == '\r'.code && b == '\n'.code) {
                    val line = headerSb.toString().trim()
                    headerSb.clear()
                    if (line.isEmpty()) break
                    if (requestLine.isEmpty()) {
                        requestLine = line
                    } else {
                        val colonIdx = line.indexOf(':')
                        if (colonIdx != -1) {
                            headers[line.substring(0, colonIdx).trim().lowercase()] =
                                line.substring(colonIdx + 1).trim()
                        }
                    }
                }
                prev = b
            }

            val parts = requestLine.split(" ")
            if (parts.size < 2) return
            val method = parts[0]
            val path = parts[1]

            // Check for WebSocket Upgrade
            if (headers["upgrade"]?.equals("websocket", ignoreCase = true) == true) {
                val secKey = headers["sec-websocket-key"]
                if (secKey != null) {
                    handleWebSocketHandshake(socket, input, out, secKey)
                    return
                }
            }

            // Universal CORS headers for local LAN/Hotspot WebViews
            val corsHeaders = "Access-Control-Allow-Origin: *\r\n" +
                    "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n" +
                    "Access-Control-Allow-Headers: Content-Type, Accept\r\n"

            if (method.equals("OPTIONS", ignoreCase = true)) {
                sendResponse(out, 204, "No Content", corsHeaders, "")
                socket.close()
                return
            }

            if (method.equals("GET", ignoreCase = true) && path == "/health") {
                val body = """{"status":"ok","uptime":1}"""
                sendResponse(out, 200, "OK", "$corsHeaders\r\nContent-Type: application/json\r\n", body)
                socket.close()
                return
            }

            if (method.equals("GET", ignoreCase = true) && path == "/device-info") {
                val json = JSONObject().apply {
                    put("deviceId", deviceId)
                    put("displayName", displayName)
                    put("deviceType", "android")
                    put("status", status)
                    put("currentRoomName", currentRoomName)
                    put("port", port)
                    put("timestamp", System.currentTimeMillis())
                }
                sendResponse(out, 200, "OK", "$corsHeaders\r\nContent-Type: application/json\r\n", json.toString())
                socket.close()
                return
            }

            if (method.equals("GET", ignoreCase = true) && path == "/room-info") {
                val json = roomDetailsJson ?: JSONObject().apply {
                    put("roomId", "")
                }
                sendResponse(out, 200, "OK", "$corsHeaders\r\nContent-Type: application/json\r\n", json.toString())
                socket.close()
                return
            }

            if (method.equals("POST", ignoreCase = true) && path == "/invite") {
                val contentLength = headers["content-length"]?.toIntOrNull() ?: 0
                val bodyBytes = ByteArray(contentLength)
                var read = 0
                while (read < contentLength) {
                    val r = input.read(bodyBytes, read, contentLength - read)
                    if (r == -1) break
                    read += r
                }
                val bodyStr = String(bodyBytes, 0, read, Charsets.UTF_8)
                try {
                    val inviteJson = JSONObject(bodyStr)
                    onCallInviteReceived(inviteJson)

                    val resp = JSONObject().apply {
                        put("inviteId", inviteJson.optString("inviteId"))
                        put("fromDeviceId", deviceId)
                        put("fromDisplayName", displayName)
                        put("accepted", true)
                    }
                    sendResponse(out, 200, "OK", "$corsHeaders\r\nContent-Type: application/json\r\n", resp.toString())
                } catch (e: Exception) {
                    sendResponse(out, 400, "Bad Request", corsHeaders, """{"error":"invalid_json"}""")
                }
                socket.close()
                return
            }

            sendResponse(out, 404, "Not Found", corsHeaders, "")
            socket.close()
        } catch (e: Exception) {
            Log.e("TrueCallingServer", "Error handling HTTP client", e)
            try { socket.close() } catch (ex: Exception) {}
        }
    }

    private fun handleWebSocketHandshake(
        socket: Socket,
        input: InputStream,
        out: OutputStream,
        secKey: String
    ) {
        val magicGuid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        val md = MessageDigest.getInstance("SHA-1")
        val hash = md.digest((secKey + magicGuid).toByteArray(Charsets.UTF_8))
        val acceptKey = Base64.encodeToString(hash, Base64.NO_WRAP)

        val handshakeResp = "HTTP/1.1 101 Switching Protocols\r\n" +
                "Upgrade: websocket\r\n" +
                "Connection: Upgrade\r\n" +
                "Sec-WebSocket-Accept: $acceptKey\r\n\r\n"
        out.write(handshakeResp.toByteArray(Charsets.UTF_8))
        out.flush()

        val clientId = "client-${System.currentTimeMillis()}-${(1000..9999).random()}"
        val handler = WebSocketClientHandler(clientId, socket, input, out, this)
        wsClients[clientId] = handler
        handler.run()
    }

    fun broadcastMessage(senderClientId: String?, messageText: String, targetPeerId: String?) {
        try {
            val json = JSONObject(messageText)
            val msgTarget = targetPeerId ?: json.optString("toPeerId").takeIf { it.isNotEmpty() }

            for ((id, client) in wsClients) {
                if (id == senderClientId) continue
                if (msgTarget == null || client.peerId == msgTarget) {
                    client.sendText(messageText)
                }
            }
        } catch (e: Exception) {
            Log.e("TrueCallingServer", "Failed to broadcast message", e)
        }
    }

    fun removeClient(clientId: String) {
        wsClients.remove(clientId)
    }

    private fun sendResponse(
        out: OutputStream,
        code: Int,
        statusText: String,
        headers: String,
        body: String
    ) {
        val bytes = body.toByteArray(Charsets.UTF_8)
        val headerStr = "HTTP/1.1 $code $statusText\r\n" +
                headers +
                "Content-Length: ${bytes.size}\r\n" +
                "Connection: close\r\n\r\n"
        out.write(headerStr.toByteArray(Charsets.UTF_8))
        if (bytes.isNotEmpty()) {
            out.write(bytes)
        }
        out.flush()
    }

    class WebSocketClientHandler(
        val clientId: String,
        private val socket: Socket,
        private val input: InputStream,
        private val out: OutputStream,
        private val server: EmbeddedDeviceServer
    ) {
        var peerId: String = ""
        private var isOpen = true

        fun run() {
            try {
                while (isOpen) {
                    val frame = readWebSocketFrame() ?: break
                    if (frame.opcode == 0x8) {
                        // Close frame
                        break
                    } else if (frame.opcode == 0x9) {
                        // Ping frame -> send Pong
                        sendFrame(0xA, frame.payload)
                    } else if (frame.opcode == 0x1) {
                        // Text frame
                        val text = String(frame.payload, Charsets.UTF_8)
                        handleIncomingText(text)
                    }
                }
            } catch (e: Exception) {
                Log.d("TrueCallingServer", "Client $clientId disconnected: ${e.message}")
            } finally {
                close()
            }
        }

        private fun handleIncomingText(text: String) {
            try {
                val json = JSONObject(text)
                val type = json.optString("type")
                val fromPeerId = json.optString("fromPeerId")
                if (fromPeerId.isNotEmpty()) {
                    this.peerId = fromPeerId
                }

                if (type == "JOIN_REQUEST") {
                    val payload = json.optJSONObject("payload")
                    val displayName = payload?.optString("displayName") ?: "Peer"
                    val deviceType = payload?.optString("deviceType") ?: "android"

                    val assignedId = if (fromPeerId.isNotEmpty()) fromPeerId else clientId
                    this.peerId = assignedId

                    // Send JOIN_ACCEPTED back to client
                    val roomObj = server.roomDetailsJson ?: JSONObject().apply {
                        put("roomId", "room-offline")
                        put("name", server.currentRoomName ?: "Offline Lounge")
                        put("hostId", server.deviceId)
                        put("hostIp", "127.0.0.1")
                        put("port", server.port)
                        put("hasPin", false)
                        put("participantCount", 2)
                        put("maxParticipants", 8)
                        put("createdAt", System.currentTimeMillis())
                    }

                    val acceptedMsg = JSONObject().apply {
                        put("type", "JOIN_ACCEPTED")
                        put("fromPeerId", "host")
                        put("toPeerId", assignedId)
                        put("payload", JSONObject().apply {
                            put("assignedPeerId", assignedId)
                            put("room", roomObj)
                            put("existingPeers", org.json.JSONArray())
                        })
                        put("timestamp", System.currentTimeMillis())
                    }
                    sendText(acceptedMsg.toString())

                    // Broadcast PEER_JOINED to other clients
                    val joinedMsg = JSONObject().apply {
                        put("type", "PEER_JOINED")
                        put("fromPeerId", assignedId)
                        put("payload", JSONObject().apply {
                            put("id", assignedId)
                            put("displayName", displayName)
                            put("deviceType", deviceType)
                            put("isHost", false)
                            put("isMuted", false)
                            put("joinedAt", System.currentTimeMillis())
                        })
                        put("timestamp", System.currentTimeMillis())
                    }
                    server.broadcastMessage(clientId, joinedMsg.toString(), null)
                    return
                }

                // Relaying OFFER, ANSWER, ICE_CANDIDATE, MUTE_STATUS, AUDIO_LEVEL
                val toPeerId = json.optString("toPeerId").takeIf { it.isNotEmpty() }
                server.broadcastMessage(clientId, text, toPeerId)
            } catch (e: Exception) {
                Log.e("TrueCallingServer", "Error parsing WebSocket text", e)
            }
        }

        @Synchronized
        fun sendText(text: String) {
            if (!isOpen) return
            val bytes = text.toByteArray(Charsets.UTF_8)
            sendFrame(0x1, bytes)
        }

        @Synchronized
        private fun sendFrame(opcode: Int, payload: ByteArray) {
            val length = payload.size
            out.write(0x80 or (opcode and 0x0F))

            if (length <= 125) {
                out.write(length)
            } else if (length <= 65535) {
                out.write(126)
                out.write((length shr 8) and 0xFF)
                out.write(length and 0xFF)
            } else {
                out.write(127)
                for (i in 7 downTo 0) {
                    out.write((length.toLong() shr (8 * i)).toInt() and 0xFF)
                }
            }

            out.write(payload)
            out.flush()
        }

        private class Frame(val opcode: Int, val payload: ByteArray)

        private fun readWebSocketFrame(): Frame? {
            val b0 = input.read()
            if (b0 == -1) return null
            val opcode = b0 and 0x0F

            val b1 = input.read()
            if (b1 == -1) return null
            val isMasked = (b1 and 0x80) != 0
            var payloadLen = (b1 and 0x7F).toLong()

            if (payloadLen == 126L) {
                val byte1 = input.read()
                val byte2 = input.read()
                if (byte1 == -1 || byte2 == -1) return null
                payloadLen = ((byte1 shl 8) or byte2).toLong()
            } else if (payloadLen == 127L) {
                var len = 0L
                for (i in 0 until 8) {
                    val b = input.read()
                    if (b == -1) return null
                    len = (len shl 8) or (b and 0xFF).toLong()
                }
                payloadLen = len
            }

            val maskKey = ByteArray(4)
            if (isMasked) {
                var read = 0
                while (read < 4) {
                    val r = input.read(maskKey, read, 4 - read)
                    if (r == -1) return null
                    read += r
                }
            }

            val payload = ByteArray(payloadLen.toInt())
            var totalRead = 0
            while (totalRead < payload.size) {
                val r = input.read(payload, totalRead, payload.size - totalRead)
                if (r == -1) return null
                totalRead += r
            }

            if (isMasked) {
                for (i in payload.indices) {
                    payload[i] = (payload[i].toInt() xor maskKey[i % 4].toInt()).toByte()
                }
            }

            return Frame(opcode, payload)
        }

        fun close() {
            isOpen = false
            try {
                socket.close()
            } catch (e: Exception) {}
            server.removeClient(clientId)
        }
    }
}
