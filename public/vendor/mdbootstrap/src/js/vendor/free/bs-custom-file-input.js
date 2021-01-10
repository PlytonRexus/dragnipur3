/*!
 * bsCustomFileInput v1.3.2 (https://github.com/Johann-S/bs-custom-file-input)
 * Copyright 2018 - 2019 Johann-S <johann.servoire@gmail.com>
 * Licensed under MIT (https://github.com/Johann-S/bs-custom-file-input/blob/master/LICENSE)
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory()
    : typeof define === 'function' && define.amd ? define(factory)
      : (global = global || self, global.bsCustomFileInput = factory())
}(this, function () {
  'use strict'

  const Selector = {
    CUSTOMFILE: '.custom-file input[type="file"]',
    CUSTOMFILELABEL: '.custom-file-label',
    FORM: 'form',
    INPUT: 'input'
  }

  const textNodeType = 3

  const getDefaultText = function getDefaultText (input) {
    let defaultText = ''
    const label = input.parentNode.querySelector(Selector.CUSTOMFILELABEL)

    if (label) {
      defaultText = label.innerHTML
    }

    return defaultText
  }

  const findFirstChildNode = function findFirstChildNode (element) {
    if (element.childNodes.length > 0) {
      const childNodes = [].slice.call(element.childNodes)

      for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i]

        if (node.nodeType !== textNodeType) {
          return node
        }
      }
    }

    return element
  }

  const restoreDefaultText = function restoreDefaultText (input) {
    const defaultText = input.bsCustomFileInput.defaultText
    const label = input.parentNode.querySelector(Selector.CUSTOMFILELABEL)

    if (label) {
      const element = findFirstChildNode(label)
      element.innerHTML = defaultText
    }
  }

  const fileApi = !!window.File
  const FAKE_PATH = 'fakepath'
  const FAKE_PATH_SEPARATOR = '\\'

  const getSelectedFiles = function getSelectedFiles (input) {
    if (input.hasAttribute('multiple') && fileApi) {
      return [].slice.call(input.files).map(function (file) {
        return file.name
      }).join(', ')
    }

    if (input.value.indexOf(FAKE_PATH) !== -1) {
      const splittedValue = input.value.split(FAKE_PATH_SEPARATOR)
      return splittedValue[splittedValue.length - 1]
    }

    return input.value
  }

  function handleInputChange () {
    const label = this.parentNode.querySelector(Selector.CUSTOMFILELABEL)

    if (label) {
      const element = findFirstChildNode(label)
      const inputValue = getSelectedFiles(this)

      if (inputValue.length) {
        element.innerHTML = inputValue
      } else {
        restoreDefaultText(this)
      }
    }
  }

  function handleFormReset () {
    const customFileList = [].slice.call(this.querySelectorAll(Selector.INPUT)).filter(function (input) {
      return !!input.bsCustomFileInput
    })

    for (let i = 0, len = customFileList.length; i < len; i++) {
      restoreDefaultText(customFileList[i])
    }
  }

  const customProperty = 'bsCustomFileInput'
  const Event = {
    FORMRESET: 'reset',
    INPUTCHANGE: 'change'
  }
  const bsCustomFileInput = {
    init: function init (inputSelector, formSelector) {
      if (inputSelector === void 0) {
        inputSelector = Selector.CUSTOMFILE
      }

      if (formSelector === void 0) {
        formSelector = Selector.FORM
      }

      const customFileInputList = [].slice.call(document.querySelectorAll(inputSelector))
      const formList = [].slice.call(document.querySelectorAll(formSelector))

      for (let i = 0, len = customFileInputList.length; i < len; i++) {
        const input = customFileInputList[i]
        Object.defineProperty(input, customProperty, {
          value: {
            defaultText: getDefaultText(input)
          },
          writable: true
        })
        handleInputChange.call(input)
        input.addEventListener(Event.INPUTCHANGE, handleInputChange)
      }

      for (let _i = 0, _len = formList.length; _i < _len; _i++) {
        formList[_i].addEventListener(Event.FORMRESET, handleFormReset)

        Object.defineProperty(formList[_i], customProperty, {
          value: true,
          writable: true
        })
      }
    },
    destroy: function destroy () {
      const formList = [].slice.call(document.querySelectorAll(Selector.FORM)).filter(function (form) {
        return !!form.bsCustomFileInput
      })
      const customFileInputList = [].slice.call(document.querySelectorAll(Selector.INPUT)).filter(function (input) {
        return !!input.bsCustomFileInput
      })

      for (let i = 0, len = customFileInputList.length; i < len; i++) {
        const input = customFileInputList[i]
        restoreDefaultText(input)
        input[customProperty] = undefined
        input.removeEventListener(Event.INPUTCHANGE, handleInputChange)
      }

      for (let _i2 = 0, _len2 = formList.length; _i2 < _len2; _i2++) {
        formList[_i2].removeEventListener(Event.FORMRESET, handleFormReset)

        formList[_i2][customProperty] = undefined
      }
    }
  }

  return bsCustomFileInput
}))
// # sourceMappingURL=bs-custom-file-input.js.map

document.addEventListener('DOMContentLoaded', function () {
  bsCustomFileInput.init()
})
