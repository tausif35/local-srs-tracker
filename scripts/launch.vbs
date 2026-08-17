' Compatibility launcher. The desktop shortcut should point directly to the packaged EXE.

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectDir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
launcher = fso.BuildPath(projectDir, "dist\SRS Tracker\SRS Tracker.exe")
If fso.FileExists(launcher) Then
  shell.Run Chr(34) & launcher & Chr(34), 1, False
Else
  MsgBox "SRS Tracker is not packaged yet. Run npm run package:win once.", 16, "SRS Tracker"
End If
