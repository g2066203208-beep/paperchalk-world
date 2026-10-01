plugins {
    id("com.android.application")
}

android {
    namespace = "com.paperchalk.world"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.paperchalk.world.test"
        minSdk = 26
        targetSdk = 35
        versionCode = 6
        versionName = "1.1.1"
        testInstrumentationRunner = "com.paperchalk.world.SmokeInstrumentation"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
