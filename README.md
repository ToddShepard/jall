# The *node-localize* library
provides a [GNU gettext](http://www.gnu.org/s/gettext/)-inspired (but not conformant) translation utility for [Node.js](http://nodejs.org) that tries to avoid some of the limitations of the ``sprintf``-bound ``gettext`` (such as translation string parameters being in a fixed order in all translation results) and "fit in" better than a straight port.

## Usage

``node-localize`` returns an object constructor so multiple simultaneous localization objects may be in use at once (though most cases will probably be a singleton instantiation). The only required parameter on initialization is a ``translations`` object, using the following structure:

```js
var Localize = require('localize');

var myLocalize = new Localize({
    "Testing...": {
        "es": "Pruebas...",
        "sr": "тестирање..."
    },
    "Substitution: $[1]": {
        "es": "Sustitución: $[1]",
        "sr": "замена: $[1]"
    }
});

console.log(myLocalize.translate("Testing...")); // Testing...
console.log(myLocalize.translate("Substitution: $[1]", 5)); // Substitution: 5

myLocalize.setLocale("es");
console.log(myLocalize.translate("Testing...")); // Pruebas...

myLocalize.setLocale("sr");
console.log(myLocalize.translate("Substitution: $[1]", 5)); // замена: 5
```

``node-localize`` objects can also be passed a string indicating the directory a ``translations.json`` file can be found. This directory is searched recursively for all ``translations.json`` files in all subdirectories, and their contents combined together, so you can organize your translations as you wish.

## Dates

Because date formats differ so wildly in different languages and these differences cannot be solved via simple substitution, there is also a ``localDate`` method for translating these values.

```js
var theDate = new Date("4-Jul-1776");
var dateLocalize = new Localize("./translations");
dateLocalize.loadDateFormats({
	"es": {
		dayNames: [
			'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb',
			'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
		],
		monthNames: [
			'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
			'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
		],
		masks: {
			"default": "dddd, d 'de' mmmm yyyy"
		}
	}
});

console.log(dateLocalize.localDate(theDate)); // Thu Jul 04 1776 00:00:00
console.log(dateLocalize.localDate(theDate, "fullDate")); // Thursday, July 4, 1776
console.log(dateLocalize.localDate(theDate, "mm/dd/yyyy")); // 07/04/1776

dateLocalize.setLocale("es");
console.log(dateLocalize.localDate(theDate)); // Jueves, 4 de Julio 1776
```

The date formatting rules and configuration have been taken from [node-dateformat](https://github.com/felixge/node-dateformat), which has been extended to support multiple simultaneous locales and subsumed into ``node-localize``.

## Complete API

```js
var myLocalize = new Localize(translationsObjOrStr, dateFormatObj, defaultLocaleStr);
// translationsObjOrStr: a conformant translations object or a string indicating
//     the directory where one or more conformant translations.json files are stored
// dateFormatObj: a conformant date format object, containing one or more locales
//     if not specified, will auto-generate an 'en' locale; if initially specified,
//     will *overwrite* this auto-generated locale object
// defaultLocale: the locale of all keys in the translations object. Defaults to 'en'
```

```js
myLocalize.setLocale(localeStr);
// localeStr: a locale string to switch to
```

```js
myLocalize.loadTranslations(translationsObjOrStr);
// translationsObjOrStr: a conformant translations object or a string indicating
//     the directory where one or more conformant translations.json files are stored
//     Multiple calls to loadTranslations *appends* the keys to the translations
//     object in memory (overwriting duplicate keys).
```

```js
myLocalize.clearTranslations();
// Wipes out the translations object entirely (if a clean reload is desired)
```

```js
myLocalize.throwOnMissingTranslation(throwBool);
// throwBool: Boolean indicating whether or not missing translations should
//     throw an error or be silently ignored and the text stay in the default
//     locale. Useful for development to turn off.
```

```js
myLocalize.translate(translateStr, arg1, arg2, ...);
// translateStr: The string to be translated and optionally perform a
//     substitution of specified args into. Arguments are specified in a RegExp
//     style by number starting with 1 (it is the first argument that can be
//     used and also is the arguments[1] value...), while using a jQuery-style
//     demarcation of $[x], where x is the argument number.
```

```js
myLocalize.loadDateFormats(dateFormatObj);
// dateFormatObj: a conformant date format object, containing one or more locales
//     Specified locales are appended to the internal object just like
//     loadTranslations.
```

```js
myLocalize.clearDateFormats();
// Resets the date formats object to just the 'en' locale.
```

```js
myLocalize.localDate(dateObjOrStr, maskStr, utcBool)
// dateObjOrStr: the date object or string to format as desired in the current
//     locale.
// maskStr: the predefined mask to use, or a custom mask.
// utcBool: a boolean indicating whether the timezone should be local or UTC
```

## [Express](http://expressjs.com) Integration Tips

If your website supports multiple languages (probably why you're using this library!), you'll want to translate the page content for each supported language. The following snippets of code should make it easy to use within Express.

### Middleware to switch locale on request

```js
app.configure(function() {
    ...
    app.use(function(request, response, next) {
        var lang = request.session.lang || "en";
        localize.setLocale(lang);
        next();
    });
    ...
});
```

I'm assuming you're storing their language preference inside of a session, but the logic can be easily tweaked for however you detect which language to show.

### Export *translate* and *localDate* as static helpers

```js
app.helpers({
    ...
    translate: localize.translate,
    localDate: localize.localDate
});
```

Your controllers shouldn't really even be aware of any localization issues; the views should be doing that, so this ought to be enough configuration within your ``app.js`` file.

### Using *translate* and *localDate* in your views

```html
<h1>${translate("My Awesome Webpage")}</h1>

<h2>${translate("By: $[1]", webpageAuthor)}</h2>

<h3>${translate("Published: $[1]", localDate(publicationDate))}</h3>

{{if session.lang != "en"}}
<strong>${translate("Warning: The following content is in English.")}</strong>
{{/if}}
```

I'm using [jQuery Templates for Express](https://github.com/kof/node-jqtpl) here, but it should be easy to translate to whatever templating language you prefer.

## Planned Features

* Browser compatibility (use same functions for client-side jQuery Templates, for instance)
* ``translations.es.json``, ``translations.de.json``, etc to allow more .po-like translation definitions and easier translation work for multiple translators
* Numeric localization (1,234,567.89 versus 1.234.567,89 versus 1 234 567,89 versus [Japanese Numerals](http://en.wikipedia.org/wiki/Japanese_numerals) [no idea how to handle that one at the moment])
* Currency localization; not just representing $100.00 versus 100,00$, but perhaps hooking into currency conversion, as well.
* ``xgettext``-like cli utility to parse source files for text to translate and build a template file for translators

## License (MIT)

Copyright (C) 2011 by Agrosica, Inc, David Ellis, Felix Geisendörfer, Steven Levithan, Scott Trenda, Kris Kowal.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.