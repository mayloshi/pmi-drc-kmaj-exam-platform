$ErrorActionPreference = "Stop"
$env:CI = "true"
$env:Path = "C:\Users\andry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;$env:Path"
& "C:\Users\andry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" "node_modules\vinext\dist\cli.js" "dev"
