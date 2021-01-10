/*!
 * chartjs-plugin-datalabels v0.7.0
 * https://chartjs-plugin-datalabels.netlify.com
 * (c) 2019 Chart.js Contributors
 * Released under the MIT license
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('chart.js'))
    : typeof define === 'function' && define.amd ? define(['chart.js'], factory)
      : (global = global || self, global.ChartDataLabels = factory(global.Chart))
}(this, function (Chart) {
  'use strict'

  Chart = Chart && Chart.hasOwnProperty('default') ? Chart.default : Chart

  const helpers = Chart.helpers

  const devicePixelRatio = (function () {
    if (typeof window !== 'undefined') {
      if (window.devicePixelRatio) {
        return window.devicePixelRatio
      }

      // devicePixelRatio is undefined on IE10
      // https://stackoverflow.com/a/20204180/8837887
      // https://github.com/chartjs/chartjs-plugin-datalabels/issues/85
      const screen = window.screen
      if (screen) {
        return (screen.deviceXDPI || 1) / (screen.logicalXDPI || 1)
      }
    }

    return 1
  }())

  var utils = {
    // @todo move this in Chart.helpers.toTextLines
    toTextLines: function (inputs) {
      const lines = []
      let input

      inputs = [].concat(inputs)
      while (inputs.length) {
        input = inputs.pop()
        if (typeof input === 'string') {
          lines.unshift.apply(lines, input.split('\n'))
        } else if (Array.isArray(input)) {
          inputs.push.apply(inputs, input)
        } else if (!helpers.isNullOrUndef(inputs)) {
          lines.unshift('' + input)
        }
      }

      return lines
    },

    // @todo move this method in Chart.helpers.canvas.toFont (deprecates helpers.fontString)
    // @see https://developer.mozilla.org/en-US/docs/Web/CSS/font
    toFontString: function (font) {
      if (!font || helpers.isNullOrUndef(font.size) || helpers.isNullOrUndef(font.family)) {
        return null
      }

      return (font.style ? font.style + ' ' : '') +
			(font.weight ? font.weight + ' ' : '') +
			font.size + 'px ' +
			font.family
    },

    // @todo move this in Chart.helpers.canvas.textSize
    // @todo cache calls of measureText if font doesn't change?!
    textSize: function (ctx, lines, font) {
      const items = [].concat(lines)
      const ilen = items.length
      const prev = ctx.font
      let width = 0
      let i

      ctx.font = font.string

      for (i = 0; i < ilen; ++i) {
        width = Math.max(ctx.measureText(items[i]).width, width)
      }

      ctx.font = prev

      return {
        height: ilen * font.lineHeight,
        width: width
      }
    },

    // @todo move this method in Chart.helpers.options.toFont
    parseFont: function (value) {
      const global = Chart.defaults.global
      const size = helpers.valueOrDefault(value.size, global.defaultFontSize)
      const font = {
        family: helpers.valueOrDefault(value.family, global.defaultFontFamily),
        lineHeight: helpers.options.toLineHeight(value.lineHeight, size),
        size: size,
        style: helpers.valueOrDefault(value.style, global.defaultFontStyle),
        weight: helpers.valueOrDefault(value.weight, null),
        string: ''
      }

      font.string = utils.toFontString(font)
      return font
    },

    /**
	 * Returns value bounded by min and max. This is equivalent to max(min, min(value, max)).
	 * @todo move this method in Chart.helpers.bound
	 * https://doc.qt.io/qt-5/qtglobal.html#qBound
	 */
    bound: function (min, value, max) {
      return Math.max(min, Math.min(value, max))
    },

    /**
	 * Returns an array of pair [value, state] where state is:
	 * * -1: value is only in a0 (removed)
	 * *  1: value is only in a1 (added)
	 */
    arrayDiff: function (a0, a1) {
      const prev = a0.slice()
      const updates = []
      let i, j, ilen, v

      for (i = 0, ilen = a1.length; i < ilen; ++i) {
        v = a1[i]
        j = prev.indexOf(v)

        if (j === -1) {
          updates.push([v, 1])
        } else {
          prev.splice(j, 1)
        }
      }

      for (i = 0, ilen = prev.length; i < ilen; ++i) {
        updates.push([prev[i], -1])
      }

      return updates
    },

    /**
	 * https://github.com/chartjs/chartjs-plugin-datalabels/issues/70
	 */
    rasterize: function (v) {
      return Math.round(v * devicePixelRatio) / devicePixelRatio
    }
  }

  function orient (point, origin) {
    const x0 = origin.x
    const y0 = origin.y

    if (x0 === null) {
      return { x: 0, y: -1 }
    }
    if (y0 === null) {
      return { x: 1, y: 0 }
    }

    const dx = point.x - x0
    const dy = point.y - y0
    const ln = Math.sqrt(dx * dx + dy * dy)

    return {
      x: ln ? dx / ln : 0,
      y: ln ? dy / ln : -1
    }
  }

  function aligned (x, y, vx, vy, align) {
    switch (align) {
      case 'center':
        vx = vy = 0
        break
      case 'bottom':
        vx = 0
        vy = 1
        break
      case 'right':
        vx = 1
        vy = 0
        break
      case 'left':
        vx = -1
        vy = 0
        break
      case 'top':
        vx = 0
        vy = -1
        break
      case 'start':
        vx = -vx
        vy = -vy
        break
      case 'end':
        // keep natural orientation
        break
      default:
        // clockwise rotation (in degree)
        align *= (Math.PI / 180)
        vx = Math.cos(align)
        vy = Math.sin(align)
        break
    }

    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy
    }
  }

  // Line clipping (Cohen–Sutherland algorithm)
  // https://en.wikipedia.org/wiki/Cohen–Sutherland_algorithm

  const R_INSIDE = 0
  const R_LEFT = 1
  const R_RIGHT = 2
  const R_BOTTOM = 4
  const R_TOP = 8

  function region (x, y, rect) {
    let res = R_INSIDE

    if (x < rect.left) {
      res |= R_LEFT
    } else if (x > rect.right) {
      res |= R_RIGHT
    }
    if (y < rect.top) {
      res |= R_TOP
    } else if (y > rect.bottom) {
      res |= R_BOTTOM
    }

    return res
  }

  function clipped (segment, area) {
    let x0 = segment.x0
    let y0 = segment.y0
    let x1 = segment.x1
    let y1 = segment.y1
    let r0 = region(x0, y0, area)
    let r1 = region(x1, y1, area)
    let r, x, y

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (!(r0 | r1) || (r0 & r1)) {
        // both points inside or on the same side: no clipping
        break
      }

      // at least one point is outside
      r = r0 || r1

      if (r & R_TOP) {
        x = x0 + (x1 - x0) * (area.top - y0) / (y1 - y0)
        y = area.top
      } else if (r & R_BOTTOM) {
        x = x0 + (x1 - x0) * (area.bottom - y0) / (y1 - y0)
        y = area.bottom
      } else if (r & R_RIGHT) {
        y = y0 + (y1 - y0) * (area.right - x0) / (x1 - x0)
        x = area.right
      } else if (r & R_LEFT) {
        y = y0 + (y1 - y0) * (area.left - x0) / (x1 - x0)
        x = area.left
      }

      if (r === r0) {
        x0 = x
        y0 = y
        r0 = region(x0, y0, area)
      } else {
        x1 = x
        y1 = y
        r1 = region(x1, y1, area)
      }
    }

    return {
      x0: x0,
      x1: x1,
      y0: y0,
      y1: y1
    }
  }

  function compute (range, config) {
    const anchor = config.anchor
    let segment = range
    let x, y

    if (config.clamp) {
      segment = clipped(segment, config.area)
    }

    if (anchor === 'start') {
      x = segment.x0
      y = segment.y0
    } else if (anchor === 'end') {
      x = segment.x1
      y = segment.y1
    } else {
      x = (segment.x0 + segment.x1) / 2
      y = (segment.y0 + segment.y1) / 2
    }

    return aligned(x, y, range.vx, range.vy, config.align)
  }

  const positioners = {
    arc: function (vm, config) {
      const angle = (vm.startAngle + vm.endAngle) / 2
      const vx = Math.cos(angle)
      const vy = Math.sin(angle)
      const r0 = vm.innerRadius
      const r1 = vm.outerRadius

      return compute({
        x0: vm.x + vx * r0,
        y0: vm.y + vy * r0,
        x1: vm.x + vx * r1,
        y1: vm.y + vy * r1,
        vx: vx,
        vy: vy
      }, config)
    },

    point: function (vm, config) {
      const v = orient(vm, config.origin)
      const rx = v.x * vm.radius
      const ry = v.y * vm.radius

      return compute({
        x0: vm.x - rx,
        y0: vm.y - ry,
        x1: vm.x + rx,
        y1: vm.y + ry,
        vx: v.x,
        vy: v.y
      }, config)
    },

    rect: function (vm, config) {
      const v = orient(vm, config.origin)
      let x = vm.x
      let y = vm.y
      let sx = 0
      let sy = 0

      if (vm.horizontal) {
        x = Math.min(vm.x, vm.base)
        sx = Math.abs(vm.base - vm.x)
      } else {
        y = Math.min(vm.y, vm.base)
        sy = Math.abs(vm.base - vm.y)
      }

      return compute({
        x0: x,
        y0: y + sy,
        x1: x + sx,
        y1: y,
        vx: v.x,
        vy: v.y
      }, config)
    },

    fallback: function (vm, config) {
      const v = orient(vm, config.origin)

      return compute({
        x0: vm.x,
        y0: vm.y,
        x1: vm.x,
        y1: vm.y,
        vx: v.x,
        vy: v.y
      }, config)
    }
  }

  const helpers$1 = Chart.helpers
  const rasterize = utils.rasterize

  function boundingRects (model) {
    const borderWidth = model.borderWidth || 0
    const padding = model.padding
    const th = model.size.height
    const tw = model.size.width
    const tx = -tw / 2
    const ty = -th / 2

    return {
      frame: {
        x: tx - padding.left - borderWidth,
        y: ty - padding.top - borderWidth,
        w: tw + padding.width + borderWidth * 2,
        h: th + padding.height + borderWidth * 2
      },
      text: {
        x: tx,
        y: ty,
        w: tw,
        h: th
      }
    }
  }

  function getScaleOrigin (el) {
    const horizontal = el._model.horizontal
    const scale = el._scale || (horizontal && el._xScale) || el._yScale

    if (!scale) {
      return null
    }

    if (scale.xCenter !== undefined && scale.yCenter !== undefined) {
      return { x: scale.xCenter, y: scale.yCenter }
    }

    const pixel = scale.getBasePixel()
    return horizontal
      ? { x: pixel, y: null }
      : { x: null, y: pixel }
  }

  function getPositioner (el) {
    if (el instanceof Chart.elements.Arc) {
      return positioners.arc
    }
    if (el instanceof Chart.elements.Point) {
      return positioners.point
    }
    if (el instanceof Chart.elements.Rectangle) {
      return positioners.rect
    }
    return positioners.fallback
  }

  function drawFrame (ctx, rect, model) {
    const bgColor = model.backgroundColor
    const borderColor = model.borderColor
    const borderWidth = model.borderWidth

    if (!bgColor && (!borderColor || !borderWidth)) {
      return
    }

    ctx.beginPath()

    helpers$1.canvas.roundedRect(
      ctx,
      rasterize(rect.x) + borderWidth / 2,
      rasterize(rect.y) + borderWidth / 2,
      rasterize(rect.w) - borderWidth,
      rasterize(rect.h) - borderWidth,
      model.borderRadius)

    ctx.closePath()

    if (bgColor) {
      ctx.fillStyle = bgColor
      ctx.fill()
    }

    if (borderColor && borderWidth) {
      ctx.strokeStyle = borderColor
      ctx.lineWidth = borderWidth
      ctx.lineJoin = 'miter'
      ctx.stroke()
    }
  }

  function textGeometry (rect, align, font) {
    const h = font.lineHeight
    const w = rect.w
    let x = rect.x
    const y = rect.y + h / 2

    if (align === 'center') {
      x += w / 2
    } else if (align === 'end' || align === 'right') {
      x += w
    }

    return {
      h: h,
      w: w,
      x: x,
      y: y
    }
  }

  function drawTextLine (ctx, text, cfg) {
    const shadow = ctx.shadowBlur
    const stroked = cfg.stroked
    const x = rasterize(cfg.x)
    const y = rasterize(cfg.y)
    const w = rasterize(cfg.w)

    if (stroked) {
      ctx.strokeText(text, x, y, w)
    }

    if (cfg.filled) {
      if (shadow && stroked) {
        // Prevent drawing shadow on both the text stroke and fill, so
        // if the text is stroked, remove the shadow for the text fill.
        ctx.shadowBlur = 0
      }

      ctx.fillText(text, x, y, w)

      if (shadow && stroked) {
        ctx.shadowBlur = shadow
      }
    }
  }

  function drawText (ctx, lines, rect, model) {
    const align = model.textAlign
    const color = model.color
    const filled = !!color
    const font = model.font
    let ilen = lines.length
    const strokeColor = model.textStrokeColor
    const strokeWidth = model.textStrokeWidth
    const stroked = strokeColor && strokeWidth
    let i

    if (!ilen || (!filled && !stroked)) {
      return
    }

    // Adjust coordinates based on text alignment and line height
    rect = textGeometry(rect, align, font)

    ctx.font = font.string
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = model.textShadowBlur
    ctx.shadowColor = model.textShadowColor

    if (filled) {
      ctx.fillStyle = color
    }
    if (stroked) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = strokeWidth
      ctx.strokeStyle = strokeColor
    }

    for (i = 0, ilen = lines.length; i < ilen; ++i) {
      drawTextLine(ctx, lines[i], {
        stroked: stroked,
        filled: filled,
        w: rect.w,
        x: rect.x,
        y: rect.y + rect.h * i
      })
    }
  }

  const Label = function (config, ctx, el, index) {
    const me = this

    me._config = config
    me._index = index
    me._model = null
    me._rects = null
    me._ctx = ctx
    me._el = el
  }

  helpers$1.extend(Label.prototype, {
    /**
	 * @private
	 */
    _modelize: function (display, lines, config, context) {
      const me = this
      const index = me._index
      const resolve = helpers$1.options.resolve
      const font = utils.parseFont(resolve([config.font, {}], context, index))
      const color = resolve([config.color, Chart.defaults.global.defaultFontColor], context, index)

      return {
        align: resolve([config.align, 'center'], context, index),
        anchor: resolve([config.anchor, 'center'], context, index),
        area: context.chart.chartArea,
        backgroundColor: resolve([config.backgroundColor, null], context, index),
        borderColor: resolve([config.borderColor, null], context, index),
        borderRadius: resolve([config.borderRadius, 0], context, index),
        borderWidth: resolve([config.borderWidth, 0], context, index),
        clamp: resolve([config.clamp, false], context, index),
        clip: resolve([config.clip, false], context, index),
        color: color,
        display: display,
        font: font,
        lines: lines,
        offset: resolve([config.offset, 0], context, index),
        opacity: resolve([config.opacity, 1], context, index),
        origin: getScaleOrigin(me._el),
        padding: helpers$1.options.toPadding(resolve([config.padding, 0], context, index)),
        positioner: getPositioner(me._el),
        rotation: resolve([config.rotation, 0], context, index) * (Math.PI / 180),
        size: utils.textSize(me._ctx, lines, font),
        textAlign: resolve([config.textAlign, 'start'], context, index),
        textShadowBlur: resolve([config.textShadowBlur, 0], context, index),
        textShadowColor: resolve([config.textShadowColor, color], context, index),
        textStrokeColor: resolve([config.textStrokeColor, color], context, index),
        textStrokeWidth: resolve([config.textStrokeWidth, 0], context, index)
      }
    },

    update: function (context) {
      const me = this
      let model = null
      let rects = null
      const index = me._index
      const config = me._config
      let value, label, lines

      // We first resolve the display option (separately) to avoid computing
      // other options in case the label is hidden (i.e. display: false).
      const display = helpers$1.options.resolve([config.display, true], context, index)

      if (display) {
        value = context.dataset.data[index]
        label = helpers$1.valueOrDefault(helpers$1.callback(config.formatter, [value, context]), value)
        lines = helpers$1.isNullOrUndef(label) ? [] : utils.toTextLines(label)

        if (lines.length) {
          model = me._modelize(display, lines, config, context)
          rects = boundingRects(model)
        }
      }

      me._model = model
      me._rects = rects
    },

    geometry: function () {
      return this._rects ? this._rects.frame : {}
    },

    rotation: function () {
      return this._model ? this._model.rotation : 0
    },

    visible: function () {
      return this._model && this._model.opacity
    },

    model: function () {
      return this._model
    },

    draw: function (chart, center) {
      const me = this
      const ctx = chart.ctx
      const model = me._model
      const rects = me._rects
      let area

      if (!this.visible()) {
        return
      }

      ctx.save()

      if (model.clip) {
        area = model.area
        ctx.beginPath()
        ctx.rect(
          area.left,
          area.top,
          area.right - area.left,
          area.bottom - area.top)
        ctx.clip()
      }

      ctx.globalAlpha = utils.bound(0, model.opacity, 1)
      ctx.translate(rasterize(center.x), rasterize(center.y))
      ctx.rotate(model.rotation)

      drawFrame(ctx, rects.frame, model)
      drawText(ctx, model.lines, rects.text, model)

      ctx.restore()
    }
  })

  const helpers$2 = Chart.helpers

  const MIN_INTEGER = Number.MIN_SAFE_INTEGER || -9007199254740991 // eslint-disable-line es/no-number-minsafeinteger
  const MAX_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991 // eslint-disable-line es/no-number-maxsafeinteger

  function rotated (point, center, angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const cx = center.x
    const cy = center.y

    return {
      x: cx + cos * (point.x - cx) - sin * (point.y - cy),
      y: cy + sin * (point.x - cx) + cos * (point.y - cy)
    }
  }

  function projected (points, axis) {
    let min = MAX_INTEGER
    let max = MIN_INTEGER
    const origin = axis.origin
    let i, pt, vx, vy, dp

    for (i = 0; i < points.length; ++i) {
      pt = points[i]
      vx = pt.x - origin.x
      vy = pt.y - origin.y
      dp = axis.vx * vx + axis.vy * vy
      min = Math.min(min, dp)
      max = Math.max(max, dp)
    }

    return {
      min: min,
      max: max
    }
  }

  function toAxis (p0, p1) {
    const vx = p1.x - p0.x
    const vy = p1.y - p0.y
    const ln = Math.sqrt(vx * vx + vy * vy)

    return {
      vx: (p1.x - p0.x) / ln,
      vy: (p1.y - p0.y) / ln,
      origin: p0,
      ln: ln
    }
  }

  const HitBox = function () {
    this._rotation = 0
    this._rect = {
      x: 0,
      y: 0,
      w: 0,
      h: 0
    }
  }

  helpers$2.extend(HitBox.prototype, {
    center: function () {
      const r = this._rect
      return {
        x: r.x + r.w / 2,
        y: r.y + r.h / 2
      }
    },

    update: function (center, rect, rotation) {
      this._rotation = rotation
      this._rect = {
        x: rect.x + center.x,
        y: rect.y + center.y,
        w: rect.w,
        h: rect.h
      }
    },

    contains: function (point) {
      const me = this
      const margin = 1
      const rect = me._rect

      point = rotated(point, me.center(), -me._rotation)

      return !(point.x < rect.x - margin ||
			point.y < rect.y - margin ||
			point.x > rect.x + rect.w + margin * 2 ||
			point.y > rect.y + rect.h + margin * 2)
    },

    // Separating Axis Theorem
    // https://gamedevelopment.tutsplus.com/tutorials/collision-detection-using-the-separating-axis-theorem--gamedev-169
    intersects: function (other) {
      const r0 = this._points()
      const r1 = other._points()
      const axes = [
        toAxis(r0[0], r0[1]),
        toAxis(r0[0], r0[3])
      ]
      let i, pr0, pr1

      if (this._rotation !== other._rotation) {
        // Only separate with r1 axis if the rotation is different,
        // else it's enough to separate r0 and r1 with r0 axis only!
        axes.push(
          toAxis(r1[0], r1[1]),
          toAxis(r1[0], r1[3])
        )
      }

      for (i = 0; i < axes.length; ++i) {
        pr0 = projected(r0, axes[i])
        pr1 = projected(r1, axes[i])

        if (pr0.max < pr1.min || pr1.max < pr0.min) {
          return false
        }
      }

      return true
    },

    /**
	 * @private
	 */
    _points: function () {
      const me = this
      const rect = me._rect
      const angle = me._rotation
      const center = me.center()

      return [
        rotated({ x: rect.x, y: rect.y }, center, angle),
        rotated({ x: rect.x + rect.w, y: rect.y }, center, angle),
        rotated({ x: rect.x + rect.w, y: rect.y + rect.h }, center, angle),
        rotated({ x: rect.x, y: rect.y + rect.h }, center, angle)
      ]
    }
  })

  function coordinates (view, model, geometry) {
    const point = model.positioner(view, model)
    const vx = point.vx
    const vy = point.vy

    if (!vx && !vy) {
      // if aligned center, we don't want to offset the center point
      return { x: point.x, y: point.y }
    }

    const w = geometry.w
    const h = geometry.h

    // take in account the label rotation
    const rotation = model.rotation
    let dx = Math.abs(w / 2 * Math.cos(rotation)) + Math.abs(h / 2 * Math.sin(rotation))
    let dy = Math.abs(w / 2 * Math.sin(rotation)) + Math.abs(h / 2 * Math.cos(rotation))

    // scale the unit vector (vx, vy) to get at least dx or dy equal to
    // w or h respectively (else we would calculate the distance to the
    // ellipse inscribed in the bounding rect)
    const vs = 1 / Math.max(Math.abs(vx), Math.abs(vy))
    dx *= vx * vs
    dy *= vy * vs

    // finally, include the explicit offset
    dx += model.offset * vx
    dy += model.offset * vy

    return {
      x: point.x + dx,
      y: point.y + dy
    }
  }

  function collide (labels, collider) {
    let i, j, s0, s1

    // IMPORTANT Iterate in the reverse order since items at the end of the
    // list have an higher weight/priority and thus should be less impacted
    // by the overlapping strategy.

    for (i = labels.length - 1; i >= 0; --i) {
      s0 = labels[i].$layout

      for (j = i - 1; j >= 0 && s0._visible; --j) {
        s1 = labels[j].$layout

        if (s1._visible && s0._box.intersects(s1._box)) {
          collider(s0, s1)
        }
      }
    }

    return labels
  }

  function compute$1 (labels) {
    let i, ilen, label, state, geometry, center

    // Initialize labels for overlap detection
    for (i = 0, ilen = labels.length; i < ilen; ++i) {
      label = labels[i]
      state = label.$layout

      if (state._visible) {
        geometry = label.geometry()
        center = coordinates(label._el._model, label.model(), geometry)
        state._box.update(center, geometry, label.rotation())
      }
    }

    // Auto hide overlapping labels
    return collide(labels, function (s0, s1) {
      const h0 = s0._hidable
      const h1 = s1._hidable

      if ((h0 && h1) || h1) {
        s1._visible = false
      } else if (h0) {
        s0._visible = false
      }
    })
  }

  const layout = {
    prepare: function (datasets) {
      const labels = []
      let i, j, ilen, jlen, label

      for (i = 0, ilen = datasets.length; i < ilen; ++i) {
        for (j = 0, jlen = datasets[i].length; j < jlen; ++j) {
          label = datasets[i][j]
          labels.push(label)
          label.$layout = {
            _box: new HitBox(),
            _hidable: false,
            _visible: true,
            _set: i,
            _idx: j
          }
        }
      }

      // TODO New `z` option: labels with a higher z-index are drawn
      // of top of the ones with a lower index. Lowest z-index labels
      // are also discarded first when hiding overlapping labels.
      labels.sort(function (a, b) {
        const sa = a.$layout
        const sb = b.$layout

        return sa._idx === sb._idx
          ? sb._set - sa._set
          : sb._idx - sa._idx
      })

      this.update(labels)

      return labels
    },

    update: function (labels) {
      let dirty = false
      let i, ilen, label, model, state

      for (i = 0, ilen = labels.length; i < ilen; ++i) {
        label = labels[i]
        model = label.model()
        state = label.$layout
        state._hidable = model && model.display === 'auto'
        state._visible = label.visible()
        dirty |= state._hidable
      }

      if (dirty) {
        compute$1(labels)
      }
    },

    lookup: function (labels, point) {
      let i, state

      // IMPORTANT Iterate in the reverse order since items at the end of
      // the list have an higher z-index, thus should be picked first.

      for (i = labels.length - 1; i >= 0; --i) {
        state = labels[i].$layout

        if (state && state._visible && state._box.contains(point)) {
          return labels[i]
        }
      }

      return null
    },

    draw: function (chart, labels) {
      let i, ilen, label, state, geometry, center

      for (i = 0, ilen = labels.length; i < ilen; ++i) {
        label = labels[i]
        state = label.$layout

        if (state._visible) {
          geometry = label.geometry()
          center = coordinates(label._el._view, label.model(), geometry)
          state._box.update(center, geometry, label.rotation())
          label.draw(chart, center)
        }
      }
    }
  }

  const helpers$3 = Chart.helpers

  const formatter = function (value) {
    if (helpers$3.isNullOrUndef(value)) {
      return null
    }

    let label = value
    let keys, klen, k
    if (helpers$3.isObject(value)) {
      if (!helpers$3.isNullOrUndef(value.label)) {
        label = value.label
      } else if (!helpers$3.isNullOrUndef(value.r)) {
        label = value.r
      } else {
        label = ''
        keys = Object.keys(value)
        for (k = 0, klen = keys.length; k < klen; ++k) {
          label += (k !== 0 ? ', ' : '') + keys[k] + ': ' + value[keys[k]]
        }
      }
    }

    return '' + label
  }

  /**
 * IMPORTANT: make sure to also update tests and TypeScript definition
 * files (`/test/specs/defaults.spec.js` and `/types/options.d.ts`)
 */

  const defaults = {
    align: 'center',
    anchor: 'center',
    backgroundColor: null,
    borderColor: null,
    borderRadius: 0,
    borderWidth: 0,
    clamp: false,
    clip: false,
    color: undefined,
    display: true,
    font: {
      family: undefined,
      lineHeight: 1.2,
      size: undefined,
      style: undefined,
      weight: null
    },
    formatter: formatter,
    labels: undefined,
    listeners: {},
    offset: 4,
    opacity: 1,
    padding: {
      top: 4,
      right: 4,
      bottom: 4,
      left: 4
    },
    rotation: 0,
    textAlign: 'start',
    textStrokeColor: undefined,
    textStrokeWidth: 0,
    textShadowBlur: 0,
    textShadowColor: undefined
  }

  /**
 * @see https://github.com/chartjs/Chart.js/issues/4176
 */

  const helpers$4 = Chart.helpers
  const EXPANDO_KEY = '$datalabels'
  const DEFAULT_KEY = '$default'

  function configure (dataset, options) {
    let override = dataset.datalabels
    let listeners = {}
    const configs = []
    let labels, keys

    if (override === false) {
      return null
    }
    if (override === true) {
      override = {}
    }

    options = helpers$4.merge({}, [options, override])
    labels = options.labels || {}
    keys = Object.keys(labels)
    delete options.labels

    if (keys.length) {
      keys.forEach(function (key) {
        if (labels[key]) {
          configs.push(helpers$4.merge({}, [
            options,
            labels[key],
            { _key: key }
          ]))
        }
      })
    } else {
      // Default label if no "named" label defined.
      configs.push(options)
    }

    // listeners: {<event-type>: {<label-key>: <fn>}}
    listeners = configs.reduce(function (target, config) {
      helpers$4.each(config.listeners || {}, function (fn, event) {
        target[event] = target[event] || {}
        target[event][config._key || DEFAULT_KEY] = fn
      })

      delete config.listeners
      return target
    }, {})

    return {
      labels: configs,
      listeners: listeners
    }
  }

  function dispatchEvent (chart, listeners, label) {
    if (!listeners) {
      return
    }

    const context = label.$context
    const groups = label.$groups
    let callback

    if (!listeners[groups._set]) {
      return
    }

    callback = listeners[groups._set][groups._key]
    if (!callback) {
      return
    }

    if (helpers$4.callback(callback, [context]) === true) {
      // Users are allowed to tweak the given context by injecting values that can be
      // used in scriptable options to display labels differently based on the current
      // event (e.g. highlight an hovered label). That's why we update the label with
      // the output context and schedule a new chart render by setting it dirty.
      chart[EXPANDO_KEY]._dirty = true
      label.update(context)
    }
  }

  function dispatchMoveEvents (chart, listeners, previous, label) {
    let enter, leave

    if (!previous && !label) {
      return
    }

    if (!previous) {
      enter = true
    } else if (!label) {
      leave = true
    } else if (previous !== label) {
      leave = enter = true
    }

    if (leave) {
      dispatchEvent(chart, listeners.leave, previous)
    }
    if (enter) {
      dispatchEvent(chart, listeners.enter, label)
    }
  }

  function handleMoveEvents (chart, event) {
    const expando = chart[EXPANDO_KEY]
    const listeners = expando._listeners
    let previous, label

    if (!listeners.enter && !listeners.leave) {
      return
    }

    if (event.type === 'mousemove') {
      label = layout.lookup(expando._labels, event)
    } else if (event.type !== 'mouseout') {
      return
    }

    previous = expando._hovered
    expando._hovered = label
    dispatchMoveEvents(chart, listeners, previous, label)
  }

  function handleClickEvents (chart, event) {
    const expando = chart[EXPANDO_KEY]
    const handlers = expando._listeners.click
    const label = handlers && layout.lookup(expando._labels, event)
    if (label) {
      dispatchEvent(chart, handlers, label)
    }
  }

  // https://github.com/chartjs/chartjs-plugin-datalabels/issues/108
  function invalidate (chart) {
    if (chart.animating) {
      return
    }

    // `chart.animating` can be `false` even if there is animation in progress,
    // so let's iterate all animations to find if there is one for the `chart`.
    const animations = Chart.animationService.animations
    for (let i = 0, ilen = animations.length; i < ilen; ++i) {
      if (animations[i].chart === chart) {
        return
      }
    }

    // No render scheduled: trigger a "lazy" render that can be canceled in case
    // of hover interactions. The 1ms duration is a workaround to make sure an
    // animation is created so the controller can stop it before any transition.
    chart.render({ duration: 1, lazy: true })
  }

  Chart.defaults.global.plugins.datalabels = defaults

  const plugin = {
    id: 'datalabels',

    beforeInit: function (chart) {
      chart[EXPANDO_KEY] = {
        _actives: []
      }
    },

    beforeUpdate: function (chart) {
      const expando = chart[EXPANDO_KEY]
      expando._listened = false
      expando._listeners = {} // {<event-type>: {<dataset-index>: {<label-key>: <fn>}}}
      expando._datasets = [] // per dataset labels: [Label[]]
      expando._labels = [] // layouted labels: Label[]
    },

    afterDatasetUpdate: function (chart, args, options) {
      const datasetIndex = args.index
      const expando = chart[EXPANDO_KEY]
      const labels = expando._datasets[datasetIndex] = []
      const visible = chart.isDatasetVisible(datasetIndex)
      const dataset = chart.data.datasets[datasetIndex]
      const config = configure(dataset, options)
      const elements = args.meta.data || []
      const ctx = chart.ctx
      let i, j, ilen, jlen, cfg, key, el, label

      ctx.save()

      for (i = 0, ilen = elements.length; i < ilen; ++i) {
        el = elements[i]
        el[EXPANDO_KEY] = []

        if (visible && el && !el.hidden && !el._model.skip) {
          for (j = 0, jlen = config.labels.length; j < jlen; ++j) {
            cfg = config.labels[j]
            key = cfg._key

            label = new Label(cfg, ctx, el, i)
            label.$groups = {
              _set: datasetIndex,
              _key: key || DEFAULT_KEY
            }
            label.$context = {
              active: false,
              chart: chart,
              dataIndex: i,
              dataset: dataset,
              datasetIndex: datasetIndex
            }

            label.update(label.$context)
            el[EXPANDO_KEY].push(label)
            labels.push(label)
          }
        }
      }

      ctx.restore()

      // Store listeners at the chart level and per event type to optimize
      // cases where no listeners are registered for a specific event.
      helpers$4.merge(expando._listeners, config.listeners, {
        merger: function (event, target, source) {
          target[event] = target[event] || {}
          target[event][args.index] = source[event]
          expando._listened = true
        }
      })
    },

    afterUpdate: function (chart, options) {
      chart[EXPANDO_KEY]._labels = layout.prepare(
        chart[EXPANDO_KEY]._datasets,
        options)
    },

    // Draw labels on top of all dataset elements
    // https://github.com/chartjs/chartjs-plugin-datalabels/issues/29
    // https://github.com/chartjs/chartjs-plugin-datalabels/issues/32
    afterDatasetsDraw: function (chart) {
      layout.draw(chart, chart[EXPANDO_KEY]._labels)
    },

    beforeEvent: function (chart, event) {
      // If there is no listener registered for this chart, `listened` will be false,
      // meaning we can immediately ignore the incoming event and avoid useless extra
      // computation for users who don't implement label interactions.
      if (chart[EXPANDO_KEY]._listened) {
        switch (event.type) {
          case 'mousemove':
          case 'mouseout':
            handleMoveEvents(chart, event)
            break
          case 'click':
            handleClickEvents(chart, event)
            break
          default:
        }
      }
    },

    afterEvent: function (chart) {
      const expando = chart[EXPANDO_KEY]
      const previous = expando._actives
      const actives = expando._actives = chart.lastActive || [] // public API?!
      const updates = utils.arrayDiff(previous, actives)
      let i, ilen, j, jlen, update, label, labels

      for (i = 0, ilen = updates.length; i < ilen; ++i) {
        update = updates[i]
        if (update[1]) {
          labels = update[0][EXPANDO_KEY] || []
          for (j = 0, jlen = labels.length; j < jlen; ++j) {
            label = labels[j]
            label.$context.active = (update[1] === 1)
            label.update(label.$context)
          }
        }
      }

      if (expando._dirty || updates.length) {
        layout.update(expando._labels)
        invalidate(chart)
      }

      delete expando._dirty
    }
  }

  // TODO Remove at version 1, we shouldn't automatically register plugins.
  // https://github.com/chartjs/chartjs-plugin-datalabels/issues/42
  Chart.plugins.unregister(plugin)
  return plugin
}))
