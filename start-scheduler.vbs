' Starts the pricing-tracker cron daemon hidden (no console window).
' Self-locating: runs scheduler.js from this script's own folder, so it works
' wherever the project lives. Used for manual start and by the Startup launcher.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
sh.Run "node scheduler.js", 0, False
