console.log("clearTags.js")
tags = document.querySelectorAll('.tl-dw-tag');
for (let i = 0; i < tags.length; i++) {
  tags[i].remove();
}