import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        FileInputStream(keystorePropsFile).use { load(it) }
    }
}
fun signingProp(key: String, env: String): String? =
    keystoreProps.getProperty(key) ?: System.getenv(env)
val releaseStoreFile: String? = signingProp("storeFile", "KEYSTORE_FILE")

android {
    namespace = "com.truecalling"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.truecalling.app"
        minSdk = 26
        targetSdk = 35
        versionCode = System.getenv("GITHUB_RUN_NUMBER")?.toIntOrNull() ?: 1
        versionName = System.getenv("GITHUB_REF_NAME")?.removePrefix("v") ?: "0.1.5"
    }

    signingConfigs {
        create("release") {
            val resolvedStoreFile = if (releaseStoreFile != null) {
                val candidate = file(releaseStoreFile)
                if (candidate.exists()) candidate else rootProject.file(releaseStoreFile)
            } else null

            if (resolvedStoreFile != null && resolvedStoreFile.exists()) {
                storeFile = resolvedStoreFile
                storePassword = signingProp("storePassword", "KEYSTORE_PASSWORD")
                keyAlias = signingProp("keyAlias", "KEY_ALIAS") ?: "truecalling-upload"
                keyPassword = signingProp("keyPassword", "KEY_PASSWORD") ?: storePassword
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
