# TEMPLATER

Simply replace patterns in files or copy folder and change file names.

## Documentation

``` javascript 
/**
 * @param {String} from absolute url of template (it can be a folder)
 * @param {String} to absolute url of folder/file to be copied (it can be a folder)
 * @param {Object|Array} replaceInFiles list of variables to interpolates
 * * {myVar : myReplacement}
 * * OR [[/myRegExp/g, 'myString'], ['myString1', 'myString2']...]
 * * DON'T forget the g flag when using regexps
 * @param {Object|Array} replaceInFileNames same as above but for fileNames (only valid when copying folders)
 * @param {RegExp[]} ignorePaths regexp array to check against path. Eg: /node_module/ <= file paths that includes the word node_module will not be taken in account
 * @return {Array} createdPaths
 */
function templater(from, to, replaceInFiles = [], replaceInFileNames = [], ignorePaths = []) {
    //
}
```

Example code: 

``` javascript

const templater = require('../templater/templater');
const path = require('path');

const moduleName = 'cosmic-module'

// COPY AND REPLACE PATTERN IN A SINGLE FILE
templater.templater(
    path.resolve(__dirname, './my/template/file.js'), // from
    Path.resolve(__dirname, './my/output/renamed-file.js'), // to
    {
        'myModule': moduleName, // will replace all "myModule" string in the file with 'cosmic-module'
        'replace-this': 'by-that',
    },
);

// COPY AND REPLACE PATTERN IN A WHOLE FOLDER
templater.templater(
    path.resolve(__dirname, './my/template/module/'), // shall be a folder
    Path.resolve(__dirname, './my/output/new-module/'), // 
    [
        [/my-module/g, moduleName], // same as above but with a differnet syntax
    ],
    [
        'my-custom-file', 'cosmic-module-file' // will replace "my-custom-file" string in file name by the "cosmic-module-file" string
    ]
);

```



# FEEDBACK

Don't hesitate to write an issue for any request or make a pull request :)