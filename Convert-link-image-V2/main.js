const config = {
  "indent_size": "2",
  "indent_char": " ",
  "max_preserve_newlines": "5",
  "preserve_newlines": true,
  "keep_array_indentation": false,
  "break_chained_methods": false,
  "indent_scripts": "normal",
  "brace_style": "collapse",
  "space_before_conditional": true,
  "unescape_strings": false,
  "jslint_happy": false,
  "end_with_newline": false,
  "wrap_line_length": "40",
  "indent_inner_html": false,
  "comma_first": false,
  "e4x": false,
  "indent_empty_lines": false
};
let _textArea = document.querySelector('textarea'),
  _btn = document.querySelector('button');

_btn.addEventListener('click', () => {
  let _getValue = _textArea.value,
    _div = document.createElement('div');
  _div.innerHTML = _getValue;
  let img = _div.querySelectorAll('img'),
    _arr = new Array;
  img.forEach(i => _arr.push(`"${i.src}"`));
  let _sc = js_beautify(`config.chapterImage = [${_arr.join(', ')}]`, config);
  _textArea.value = html_beautify(`<script type="text/javascript">${_sc}</script>`, config);
})
