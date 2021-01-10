## KYI Web App v2.0

### Kick off
- [ ] Install NodeJS if you don't already have it
[https://nodejs.org/en/download/](https://nodejs.org/en/download/)
- [ ] Clone this repo
    ```sh
    git clone git@github.com:PlytonRexus/dragnipur3 dragnipur3
    ```
- [ ] Install all dependencies
    ```sh
    npm i
    ```
- [ ] Start writing

### Dev server
```sh
npm start
```

### Build
```sh
npm run build
```

### Deploy
**This will deploy to the main site. Be careful while doing this.**
Build process does not have to be run before deployment. It will be started automatically.
This command assumes that the code must be pushed to `origin` remote.
```sh
np run deploy
```

### Auto-fix formatting
This will use standard.js to reformat all of your files.
```sh
npm run fix
```

### Test for formatting errors
This will output formatting errors in your files. 
**Can potentially freeze a machine. Be careful.**
```sh
npm test
```

`public/src/js/common` contains methods and classes that are standard for all pages like:
  - Routing
  - Globals

`public/src/css/common` contains styles that are standard for all pages like:
  - fontss

### Notes
1. Put all JavaScript files inside `public/src/js/` only
2. Similarly all CSS files go inside `public/src/css` only
3. Keep HTML files wherever you need them
