// ==UserScript==
// @name         KissMAL
// @namespace    https://github.com/josefandersson/KissMAL
// @version      1.96
// @description  Adds a link to kissanime.to next to every animetitle for easy anime watching.
// @author       Josef
// @match        *://myanimelist.net/animelist/*
// @match        *://myanimelist.net/anime/*
// @match        *://myanimelist.net/mangalist/*
// @match        *://myanimelist.net/manga/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @require      https://openuserjs.org/src/libs/DrDoof/RemoveDiacritics.js
// @resource     MainCSS https://github.com/josefandersson/KissMAL/raw/master/resources/kissmal.css
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// @updateURL    https://github.com/josefandersson/KissMAL/raw/master/resources/kissmal.meta.js
// @license      GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// ==/UserScript==

/* An object that represents the current page. This object contains the methods for altering the page. */
class Page {
    constructor( url ) {
        this.url             = url;
        this.isAnime         = true;
        this.isList          = true;
        this.isNewListDesign = false;

        // Find out what page we are on. Depending on the page we'll be using different methods of altering it.
        if      (/(http[s]?:\/\/myanimelist.net\/animelist\/)/.test(url)) this.page = 'animelist';
        else if (/(http[s]?:\/\/myanimelist.net\/anime\/)/.test(url))     this.page = 'anime';
        else if (/(http[s]?:\/\/myanimelist.net\/mangalist\/)/.test(url)) this.page = 'mangalist';
        else if (/(http[s]?:\/\/myanimelist.net\/manga\/)/.test(url))     this.page = 'manga';

        // Check if we are viewing an anime or a manga page.
        if (this.page.indexOf('anime') < 0) this.isAnime = false;

        // Check if we are viewing a list page or info page.
        if (this.page.indexOf('list') < 0) this.isList = false;

        // If we are viewing a list page we have to check if it's the old or new design type. (As they also need different methods of altering.)
        else { if ($('#mal_cs_otherlinks').length <= 0)
                    this.isNewListDesign = true;
        }
    }



    /* Add the links to the page using the appropiate method. */
    makeLinks(dontMakeSettingsWindow) {
        if (page.isList) { this.makeLinksForListPage(); if (!dontMakeSettingsWindow) this.makeSettingsWindow(); }
        else             { this.makeLinksForInfoPage();                                                         }
    }



    createLinkElement(title, dub, displayText) {
        const link = document.createElement('a');
        link.href = guessURL(title, dub, !this.isAnime);
        link.innerText = displayText;
        link.className = 'kissmal_link';
        if (config.getValue('newTab')) link.target = '_blank';
        return link;
    }



    /* Add the links for a information page. */
    makeLinksForInfoPage() {
        // Get the title of the anime/manga.
        const title = document.querySelector('h1.h1 span').innerText;

        // All links will be put inside this DIV.
        const linkContainer = document.createElement('div');
        linkContainer.className = 'kissmal_link_container';

        // Create the link elements and append them to the link container
        const displayText = this.isAnime ? config.getValue('displayTextAnime') : config.getValue('displayTextManga');
        if (config.getValue('generalLinkEnabled'))             linkContainer.appendChild(this.createLinkElement(title, false, displayText));
        if (this.isAnime && config.getValue('dubLinkEnabled')) linkContainer.appendChild(this.createLinkElement(title, true,  config.getValue('displayTextDub')));

        // Insert the link container underneath the anime/manga cover image.
        const parent = document.querySelector('#content > table > tbody > tr > td.borderClass > div.js-scrollfix-bottom');
        parent.insertBefore(linkContainer, parent.children[1]);
    }



    /* Add the links for a list page. */
    makeLinksForListPage() {
        const displayText = this.isAnime ? config.getValue('displayTextAnime') : config.getValue('displayTextManga');

        // Depending on if the list is using the old or the new design we'll use different methods to add the links.
        if (this.isNewListDesign) {
            [...document.querySelectorAll('td.title')].forEach(element => {
                const childAfter = element.children[3];
                const title = element.children[0].innerText;

                if (config.getValue('generalLinkEnabled'))             element.insertBefore(this.createLinkElement(title, false, displayText), childAfter );
                if (this.isAnime && config.getValue('dubLinkEnabled')) element.insertBefore(this.createLinkElement(title, true, config.getValue('displayTextDub')), childAfter);
            });
        } else {
            [...document.querySelectorAll('.animetitle')].forEach(element => {
                const parent = element.parentNode;
                const title = element.children[0].innerText;

                if (config.getValue('generalLinkEnabled'))             parent.appendChild(this.createLinkElement(title, false, displayText));
                if (this.isAnime && config.getValue('dubLinkEnabled')) parent.appendChild(this.createLinkElement(title, true, config.getValue('displayTextDub')));
            });
        }
    }



    // Add settings window.
    makeSettingsWindow() {
        let html = '<h3 class="kissmal">KissMAL settings</h3>';
        var setting, input;
        for (var settingName in Config.settings) {
            setting = Config.settings[settingName];
            if (setting.type == 'textarea') input = `<textarea id="kmset_${settingName}"></textarea>`;
            else                            input = `<input type="${setting.type}" id="kmset_${settingName}">`;
            html += `<p>
                        <label for="kmset_${settingName}">${setting.display_text}</label>
                        ${input}<br>
                     </p>`;
        }
        html += `<p>
                    <input type="button" id="reset_settings" value="Reset">
                    <input type="button" id="save_settings" value="Save">
                    <input type="button" id="close_settings" value="Close">
                 </p>`;

        // Resets the fields in the settings popup to default settings.
        function resetSettings() {
            var setting;
            for (var settingName in Config.settings) {
                setting = Config.settings[settingName];
                if (setting.type == 'checkbox')
                    $(`#kmset_${settingName}`)[0].checked = setting.default;
                else
                    $(`#kmset_${settingName}`).val(setting.default);
            }
        }

        // Saves the values in the fields in the settings popup to config.
        function saveSettings() {
            var setting, value;
            for (var settingName in Config.settings) {
                setting = Config.settings[settingName];
                if (setting.type == 'checkbox')
                    value = $(`#kmset_${settingName}`)[0].checked;
                else
                    value = $(`#kmset_${settingName}`).val();
                config.setValue( settingName, value );
            }

            // Remake all the links with new settings.
            page.removeCreatedLinks();
            page.makeLinks(true);
        }

        // Set fields in the settings popup to those set by the user in the config.
        function loadSettings() {
            var setting;
            for (var settingName in Config.settings) {
                setting = Config.settings[settingName];
                if (setting.type == 'checkbox') {
                    $(`#kmset_${settingName}`)[0].checked = config.getValue( settingName );
                }
                else
                    $(`#kmset_${settingName}`).val(config.getValue( settingName ));
            }
        }

        // This container is the settings popup itself.
        var container = $('<div></div>').attr('id', 'kissmal_settings_container').html(html).attr('hidden', true).appendTo($(document.body));

        // Add event handlers for the settings checkboxes.
        $('#close_settings').click(function(e) { container.attr('hidden', true); });
        $('#reset_settings').click(function(e) { resetSettings();                });
        $('#save_settings').click(function(e)  { saveSettings();                 });

        // Create the button that opens the settings window.
        var settings = $('<a></a>').attr('href', '#').html('Edit KissMAL settings');

        // Add the button to the DOM.
        if (page.isNewListDesign) {
            var headerInfo = $('.header-info');
            headerInfo.html(headerInfo.html() + ' - ');
            settings.appendTo(headerInfo);
        } else {
            $('#mal_cs_otherlinks').children('div').last().append(settings);
        }

        // Add a event handler for the settings opening button.
        $(settings).click(function(e) {
            if (container.attr('hidden')) { // Container is refering to the settings window container in the DOM that was created above
                container.attr('hidden', false);
                loadSettings();
            }
        });
    }



    // Remove all kissmal links.
    removeCreatedLinks() {
        $('.kissmal_link').each(function(index, element) { element.remove(); });
    }
}


// Represents persistent user settings.
class Config {

    // All available settings.
    static get settings() {
        return {
            "linkCss":            { display_text:"Link style (css)",               description: 'Change the styling of the kissMAL links using CSS.',  type:'textarea', default:'font-size: 10px; opacity: 0.8; margin-left: 3px; margin-right: 2px;' },
            "generalLinkEnabled": { display_text:'KissMAL link enabled',           description:'Add a link to the normal version of the anime/manga.', type:'checkbox', default:true },
            "dubLinkEnabled":     { display_text:'Dubbed anime link enabled',      description:'Add a link to the dubbed version of the anime.',       type:'checkbox', default:true },
            "newTab":             { display_text:'Open kissMAL links in new tabs', description:'Open kissMAL links in new tabs.',                      type:'checkbox', default:true },
            'displayTextAnime':   { display_text:'Anime link display text',        description:'The display text of the anime kissMAL links.',         type:'text',     default:'KissAnime' },
            'displayTextManga':   { display_text:'Manga link display text',        description:'The display text of the manga KissMAL links.',         type:'text',     default:'KissManga' },
            'displayTextDub':     { display_text:'Dub link display text',          description:'The display text of the dubbed anime kissMAL links.',  type:'text',     default:'(dub)' },
        };
    }

    constructor() {
        // Get saved settings or set defaults.
        this.settingsData = {};
        let val;
        for (const settingName in Config.settings) {
            if ((val = GM_getValue( settingName )) === undefined)
                val = Config.settings[settingName].default;
            this.setValue(settingName, val);
        }
    }

    // Set setting. (Saves to disk)
    setValue( key, value ) {
        this.settingsData[key] = value;
        GM_setValue(key, value);
        return value;
    }

    // Get setting. (Doesn't load from disk)
    getValue( key ) {
        let val = this.settingsData[key];
        if (val === undefined)
            if ((val = GM_getValue( key )) === undefined)
                val = Config.settings[key].default;
        return val;
    }

    // Save settings to disk.
    saveSettings() {
        for (const settingName in this.settingsData) {
            GM_setValue(settingName, this.settingsData[settingName]);
        }
    }

    // Reset settings. (Saves to disk)
    resetSettings() {
        for (const settingName in this.settingsData) {
            setValue(settingName, Config.settings[settingName].default);
        }
    }
}



let config;
let page;

$(document).ready(() => {
    'use strict';

    // Load user settings.
    config = new Config();

    // Add the styling for the settings popup and the kissmal links.
    const style = document.createElement('style');
    style.innerHTML = GM_getResourceText('MainCSS') + '.kissmal_link {' + config.getValue('linkCss') + '}';
    document.head.appendChild(style);

    // Parse the current page we're on.
    page = new Page(window.location.href);

    // Make the links.
    page.makeLinks();
});



/* The best we can do is to guess the url for the anime from the title..
** This process should be pretty straight forward except for when the
** title of the anime contains special characters. */
function guessURL(title, dub, isManga) {
    if (title) {
        title = removeDiacritics(title);                  // Remove all diacritics
        title = title.replace(/[^\w\s\\/;:.\-,★☆]/g, ''); // Remove special characters
        title = title.replace(/[ \\/;:.,★☆]/g, '-');     // Remove whitespace
        title = title.replace(/-{2,}/g, '-');             // Remove dashes in a row
        title = title.replace(/\-$/g, '');                // Remove dash at the end of the string
        if (isManga) return `https://kissmanga.com/Manga/${title}${dub?'-dub':''}`;
        else         return `https://kissanime.ru/Anime/${title}${dub?'-dub':''}`;
    } else {
        return false;
    }
}