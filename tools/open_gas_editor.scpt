#!/usr/bin/osascript

on openGasEditor(arg)
  tell application "Google Chrome"
    activate

--     set newWindow to make new window with properties { mode: "normal" }
--     tell newWindow
--       tell tab 1
--         set URL to arg
-- 
--         repeat
--           set loaded to loading
-- 
--           if loaded = false then exit repeat
--           delay 0.2
--         end repeat
--       end tell
--     end tell
  end tell
end openGasEditor

on run argv
  if (count of argv) = 1 then
    set arg to item 1 of argv

      my openGasEditor(arg)
  else
    return
  end if
end run
