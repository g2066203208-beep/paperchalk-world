#!/usr/bin/env bash
set -euo pipefail
[[ "${EXPECTED_VERSION:-}" =~ ^[0-9a-f]{7,40}$ ]]
mkdir -p artifacts/android
capture_evidence() {
  adb exec-out screencap -p > artifacts/android/android-launch.png || true
  adb logcat -d > artifacts/android/logcat.txt || true
}
trap capture_evidence EXIT
adb install -r android-app/app/build/outputs/apk/debug/app-debug.apk
adb install -r android-app/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb logcat -c
timeout 220s adb shell am instrument -w -e expectedVersion "$EXPECTED_VERSION" com.paperchalk.world.test.test/com.paperchalk.world.SmokeInstrumentation | tee artifacts/android/instrumentation.txt
grep -q 'status=PASS' artifacts/android/instrumentation.txt
adb shell am start -n com.paperchalk.world.test/com.paperchalk.world.MainActivity
sleep 8
