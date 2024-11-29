import fs from 'fs-extra'
import path from 'path'
import fg from 'fast-glob'


/** Get the content of a folder and move it with option to replace in files or in fileNames as you go */
export function templater(
    /** absolute url of template (it can be a folder) */
    from: string,
    /** absolute url of folder/file to be copied (it can be a folder) */
    to: string,
    /** list of variables to interpolates
     * * {myVar : myReplacement}
     * * OR [[/myRegExp/g, 'myString'], ['myString1', 'myString2']...]
     * * DON'T forget the g flag when using regexps 
    */
    replaceInFiles: { [variable: string]: string } | [string: string | RegExp, replacement: string][] = [],
    /** same as above but for fileNames (only valid when copying folders) */
    replaceInFileNames = [],
    /** regexp array to check against path. Eg: /node_module/ <= file paths that includes the word node_module will not be taken in account */
    ignorePaths = []
) {
    try {
        err500IfNotSet({ from, to, varz: replaceInFiles })

        // convert all replacement data to array [ [regExpToReplace, replacer], ... ]
        const replaceInFilesArr = Array.isArray(replaceInFiles) ? replaceInFiles : Object.entries(replaceInFiles)
        replaceInFilesArr.forEach(([toReplace, replacer], i, arr) => toReplace instanceof RegExp || (arr[i] = [new RegExp(toReplace, 'g'), replacer]));
        if (isObject(replaceInFileNames)) replaceInFileNames = Object.entries(replaceInFileNames);
        replaceInFileNames.forEach(([toReplace, replacer], i, arr) => toReplace instanceof RegExp || (arr[i] = [new RegExp(toReplace, 'g'), replacer]));

        const createdPath = [] as string[]

        let files = [from]
        const templateIsDirectory = fs.statSync(from).isDirectory();
        // get directory structure
        if (templateIsDirectory) {
            if (fs.existsSync(to) && !fs.statSync(to).isDirectory()) throw '"from" argument is a directory but "to" arg is a file';
            files = fg.sync(`${from}/**/*`, { dot: true });
        } else if (fs.existsSync(to) && fs.statSync(to).isDirectory()) throw '"to" argument is a directory but "from" arg is a file';

        for (const fileFullPath of files) {
            if (ignorePaths.some(reg => reg.test(fileFullPath))) continue;
            let newFileFullPath = to;
            if (templateIsDirectory) {
                const [, filePath, fileName] = fileFullPath.match(/(.*)\/(.*)$/) || [];
                const newFilePath = filePath.replace(from, to);
                const newFileName = replaceInFileNames.reduce((str, [toReplace, replacer]) => str.replace(toReplace, replacer), fileName);
                newFileFullPath = path.join(newFilePath, newFileName);
            }
            const oldFileContent = fs.readFileSync(fileFullPath, 'utf-8');
            const newFileContent = replaceInFiles.reduce((str, [toReplace, replacer]) => str.replace(toReplace, replacer), oldFileContent);

            fs.outputFileSync(newFileFullPath, newFileContent);

            createdPath.push(newFileFullPath);
        }

        return createdPath
    } catch (err) { console.error(err); }
}

/** Inject content into a file at specified place */
export function injector(
    /** url of the file where the content will be injected */
    filePath: string,
    data: string,
    /** Number == lineNumber || RegExp == will replace the first matching group || String == will place content after the string
     * NOTE: don't forget **the g flag** for regexp if you want to match all occurences
     */
    after: number | string | RegExp
) {
    try {
        err500IfNotSet({ filePath, data, after });
        if (!fs.existsSync(filePath)) throw 'file for injection do not exist';

        const fileContent = fs.readFileSync(filePath, 'utf-8');

        let newFileContent;
        if (after instanceof RegExp) {
            newFileContent = fileContent.replace(after, (f, m1) => f.replace(m1, data));
        } else if (typeof after === 'number') {
            newFileContent = fileContent.split('\n');
            newFileContent.splice(after, 0, data);
            newFileContent = newFileContent.join('\n');
        } else if (typeof after === 'string') {
            newFileContent = fileContent.split(after).join(after + data);
        } else throw 'Wrong type for after argument';

        fs.writeFileSync(filePath, newFileContent);

        return true;
    } catch (err) { console.error(err); }
}

/** Turns a file content into a list of lines */
export function fileToLines(
    /** absolute path of file */
    filePath: string,
    /** get only lines from the first matching group */
    regexp,
    /** still count as a line;  avoid conflicting with regexp, for ex if regexp match all inside \(.*\), and a comment with "// 1] blah" is found is in the middle */
    ignoreInlineComments = true,
    /** Will trime each line */
    trim = true
): [lineNumber: number, content: string][] {
    try {
        err500IfNotSet({ filePath });
        if (!fs.existsSync(filePath)) throw 'file for injection do not exist';

        let fileContent = fs.readFileSync(filePath, 'utf-8');
        if (ignoreInlineComments) fileContent = fileContent.replace(/\/\/.*/g, '<$COMMENT$>');

        let lines, lineBegin = 0;
        if (isset(regexp) && regexp instanceof RegExp) {
            fileContent.replace(regexp, (f, m1, index, chain) => {
                const linesBefore = chain.substring(0, index).split('\n');
                lineBegin = linesBefore.length;
                lines = m1.split('\n');
            });
            if (!isset(lines)) throw `regexp doesn't match the subject string`;
        } else {
            lines = fileContent.split('\n');
        }
        if (lines[0] === '') lines[0] = 'First line';

        return lines
            .map((lineContent, i) => [lineBegin + i, trim ? lineContent.trim() : lineContent])
            .filter(([, content]) => content && !content.includes('<$COMMENT$>'));
    } catch (err) { console.error(err); }
}


function isset(...elms) {
    return elms.every(elm => typeof elm !== 'undefined' && elm !== null);
}
function isObject(obj) { return isset(obj) && typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype; }

function err500IfNotSet(objectWithVarDescription) {
    Object.entries(objectWithVarDescription).forEach(([name, value], i) => {
        if (!isset(value)) throw new Error(`Param number ${i} (${name}) is not set in templater function.`)
    })
}