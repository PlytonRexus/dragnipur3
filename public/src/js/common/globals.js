const $One = document.querySelector.bind(document)
const $All = document.querySelectorAll.bind(document)
const body = $One('body')

console.log($All, $One, body) // To bypass standardjs
