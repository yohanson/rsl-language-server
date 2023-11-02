plugin_dir = debug.getinfo(1).source:sub(2, -(1 + #"plugin/init.lua"))
require('lspconfig.configs').rsl = {
  default_config = {
    name = 'rsl-language-server',
    cmd = { 'node', plugin_dir .. 'out/server.js', '--stdio' },
    filetypes = {'rsl', 'mac', 'MAC'},
    root_dir = require('lspconfig.util').root_pattern({'RSForms.mac', '.git'}),
  }
}
require('lspconfig').rsl.setup({})

