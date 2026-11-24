# V17 knee investigation

## References
- Autodesk Maya joint tool: https://help.autodesk.com/cloudhelp/2026/ENU/Maya-CharacterAnimation/files/GUID-4357347C-D00F-409F-8938-D0E81E54C8B8.htm (joint orientation and hinge limits).
- Autodesk Maya bind skin: https://help.autodesk.com/cloudhelp/2025/ENU/Maya-CharacterAnimation/files/GUID-CF2C698A-44BB-4CA0-BCB9-DB36500DA812.htm (normalized weights and linear/DQ blend).
- Autodesk Maya pose space deformation: https://help.autodesk.com/cloudhelp/2023/ENU/Maya-CharacterAnimation/files/GUID-45D389D6-B8E4-4225-B27B-9927BB61C28D.htm (pose corrective shapes).
- Blender corrective smooth: https://docs.blender.org/manual/en/4.4/modeling/modifiers/deform/corrective_smooth.html (careful use of smoothing after armature; possible volume loss).

## Findings
V15 used independent femur and tibia axial rolls, and symmetric front/rear ring weights. V16 interpolated old posed positions, not a new skin solve. V17 separates isolated knee flexion from hip/arm problems; the thigh and distal calf remain rigid, anterior/posterior weights differ, posterior hinge position and local proximal calf compression are experimental. No claim of anatomically validated pivot or fully fixed seated pose. Do not promote to full body before checking combined pose and range. V9 also passed its isolated collision test, so collision counts alone do not establish improvement.
