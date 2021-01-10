class Route {
  /**
     *
     * @param {string} name
     * @param {string} path
     * @param {string} view
     * @param {string} body
     */
  constructor (name, path, view, body) {
 	/**
   	 * We can use WeakMaps to make this field private
   	 */
    this.props = {}
    this.name = name
    this.path = path
    this.view = view
    this.body = body
  }

  get props () {
    return this.props
  }

  set props (props) {
    this.props = props
  }

  renderView () {
    return this.view(this.props)
  }
}

export default Route
