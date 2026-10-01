#!/usr/bin/env bash
set -euo pipefail
[[ "${EXPECTED_VERSION:-}" =~ ^[0-9a-f]{7,40}$ ]]
mkdir -p artifacts/android
LOGCAT_PID=''
capture_evidence() {
  if [ -n "$LOGCAT_PID" ]; then kill "$LOGCAT_PID" 2>/dev/null || true; fi
  timeout 12s adb exec-out screencap -p > artifacts/android/android-launch.png || true
  timeout 12s adb logcat -d > artifacts/android/logcat-final.txt || true
}
trap capture_evidence EXIT
adb install -r android-app/app/build/outputs/apk/debug/app-debug.apk
adb install -r android-app/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb logcat -c
adb logcat -v threadtime > artifacts/android/logcat.txt &
LOGCAT_PID=$!
adb shell wm size 720x1280
adb shell wm density 320
NETWORK_READY=false
for attempt in $(seq 1 30); do
  if timeout 5s adb shell dumpsys connectivity > artifacts/android/connectivity.txt && grep -q 'VALIDATED' artifacts/android/connectivity.txt; then
    NETWORK_READY=true
    break
  fi
  sleep 1
done
if [ "$NETWORK_READY" != true ]; then
  echo 'Emulator network did not become validated.'
  exit 1
fi
# A cold emulator briefly switches from its boot network to Wi-Fi.
sleep 8
adb shell date -u
timeout 220s adb shell am instrument -w -e expectedVersion "$EXPECTED_VERSION" com.paperchalk.world.test.test/com.paperchalk.world.SmokeInstrumentation | tee artifacts/android/instrumentation.txt
grep -q 'status=PASS' artifacts/android/instrumentation.txt
adb shell am start -n com.paperchalk.world.test/com.paperchalk.world.MainActivity
sleep 8
