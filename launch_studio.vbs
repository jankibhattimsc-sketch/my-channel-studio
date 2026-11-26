Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir

' Check if port 5000 is open
Dim http
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
http.Open "GET", "http://localhost:5000/", False
http.setTimeouts 800, 800, 800, 800
http.Send

If Err.Number <> 0 Then
    ' Start server minimized in background
    WshShell.Run "cmd /c npm start", 0, False
    WScript.Sleep 2500
End If

' Open browser to localhost:5000
WshShell.Run "cmd /c start http://localhost:5000", 0, False
