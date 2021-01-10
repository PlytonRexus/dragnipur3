class Router {
  constructor(routes = [], renderNode) {
    this.routes = routes;
    this.renderNode = renderNode;
    this.navigate(location.pathname + location.hash);
  }

  match(route, requestPath) {
    let params = [];
    let regexPath = route.path.replace(/([:*])(\w+)/g, (full, colon, name) => {
      params.push(name);
      return '([^\/]+)';
    }) + '(?:\/|$)';
    let paramObj = {};

    let routeMatch = requestPath.match(new RegExp(regexPath));
    if (routeMatch)
  }
}

export default Router;
