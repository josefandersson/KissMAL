// ==UserScript==
// @name         KissMAL
// @namespace    https://github.com/josefandersson/KissMAL
// @version      1.92
// @description  Adds a link to kissanime.to next to every animetitle for easy anime watching.
// @author       Josef
// @match        *://myanimelist.net/animelist/*
// @match        *://myanimelist.net/anime/*
// @match        *://myanimelist.net/mangalist/*
// @match        *://myanimelist.net/manga/*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @require      https://openuserjs.org/src/libs/DrDoof/RemoveDiacritics.js
// @resource     MainCSS https://github.com/josefandersson/KissMAL/raw/master/resources/kissmal.css
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
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



    /* Add the links for a information page. */
    makeLinksForInfoPage() {
        // Get the title of the anime/manga.
        var title = $('h1.h1 span').text();

        // All links will be put inside this DIV.
        var linkContainer = $('<div>', { class: 'kissmal_link_container' });

        /* Create the link elements and append them to the link container */
        var addLink = ( dub, display_text ) => { $('<a></a>').attr('href', guessURL( title, dub, !this.isAnime )).html(display_text).addClass('kissmal_link').appendTo(linkContainer); };
        var displayText = this.isAnime ? config.getValue('displayTextAnime') : config.getValue('displayTextManga');

        if (config.getValue('generalLinkEnabled'))             addLink( false, displayText           );
        if (this.isAnime && config.getValue('dubLinkEnabled')) addLink( true,  config.getValue('displayTextDub') );

        // Insert the link container underneath the anime/manga cover image.
        $(linkContainer).insertAfter($('#content > table > tbody > tr > td.borderClass > div.js-scrollfix-bottom').children().first());

        // If links are supposed to open in a new tab, change all links target to _blank.
        if (config.getValue('newTab')) $('.kissmal_link').attr('target', '_blank');
    }



    /* Add the links for a list page. */
    makeLinksForListPage() {
        var addLink = ( title, cb, dub, display_text ) => { cb($('<a></a>').attr('href', guessURL( title, dub, !this.isAnime )).html( display_text ).addClass('kissmal_link')); };
        var displayText = this.isAnime ? config.getValue('displayTextAnime') : config.getValue('displayTextManga');

        // Depending on if the list is using the old or the new design we'll use different methods to add the links.
        if (this.isNewListDesign) {
            $('td.title').each(( index, element ) => {
                var elementAfter = $(element).children('div.add-edit-more');
                var title        = $(element).children('a').first().text();

                if (config.getValue('generalLinkEnabled'))             addLink( title, (link) => { link.insertBefore( elementAfter ); }, false, displayText                       );
                if (this.isAnime && config.getValue('dubLinkEnabled')) addLink( title, (link) => { link.insertBefore( elementAfter ); }, true,  config.getValue('displayTextDub') );
            });
        } else {
            $('.animetitle').each(( index, element ) => {
                var parent = $(element.parentNode);
                var title  = $(element).children('span').first().text();

                if (config.getValue('generalLinkEnabled'))             addLink( title, (link) => { link.appendTo( parent ); }, false, displayText                       );
                if (this.isAnime && config.getValue('dubLinkEnabled')) addLink( title, (link) => { link.appendTo( parent ); }, true,  config.getValue('displayTextDub') );
            });
        }

        // If links are supposed to open in a new tab, change all links target to _blank.
        if (config.getValue('newTab')) $('.kissmal_link').attr('target', '_blank');
    }



    /* Add the settings window. (Includes the button for opening it.) */
    makeSettingsWindow() {
        var html = '<h3 class="kissmal">KissMAL settings</h3>';
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



    /* Remove all kissmal links. */
    removeCreatedLinks() {
        $('.kissmal_link').each(function(index, element) { element.remove(); });
    }
}


/* This objects represents our settings. Contains methods for getting settings, saving settings and loading settings. */
class Config {

    /* All the settings that are available. */
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
        let self = this
        for (var settingName in Config.settings) {
            if ((val = GM_getValue( settingName )) === undefined)
                val = Config.settings[settingName].default;
            this.setValue( settingName, val );
        }
    }

    /* Set key to value. (Also saves to disk.) */
    setValue( key, value ) {
        this.settingsData[key] = value;
        GM_setValue( key, value );
        return value;
    }

    /* Get value from key. (Gets only from memory, not from disk.) */
    getValue( key ) {
        var val = this.settingsData[key];
        if (val === undefined)
            if ((val = GM_getValue( key )) === undefined)
                val = Config.settings[key].default;
        return val;
    }

    /* Saves current settings to disk. */
    saveSettings() {
        for (var settingName in this.settingsData) {
            GM_setValue( settingName, this.settingsData[settingName] );
        }
    }

    /* Reset all settings to default. (Also saves to disk.) */
    resetSettings() {
        var def;
        for (var settingName in this.settingsData) {
            setValue( settingName, Config.settings[settingName].default );
        }
    }
}



var config;
var page;

$(document).ready(() => {
    'use strict';

    // Load user settings.
    config = new Config();

    // Add the styling for the settings popup and the kissmal links.
    // GM_addStyle( GM_getResourceText('MainCSS') + '.kissmal_link {' + config.getValue('linkCss') + '}' );
    let style = document.createElement('style')
    style.innerHTML = GM_getResourceText('MainCSS') + '.kissmal_link {' + config.getValue('linkCss') + '}'
    document.head.appendChild(style)

    // Parse the current page we're on.
    page = new Page( window.location.href );

    // Make the links.
    page.makeLinks();
});



/* The best we can do is to guess the url for the anime from the title..
** This process should be pretty straight forward except for when the
** title of the anime contains special characters(letters). */
function guessURL(title, dub, isManga) {
    if (title) {
        title = removeDiacritics(title);                  // Remove all diacritics
        title = title.replace(/[^\w\s\\/;:.\-,★☆]/g, ''); // Remove special characters
        title = title.replace(/[ \\/;:.,★☆]/g, '-');     // Remove whitespace
        title = title.replace(/-{2,}/g, '-');             // Remove dashes in a row
        title = title.replace(/\-$/g, '');                // Remove dash at the end of the string
        var url = 'http://kissanime.to/Anime/';
        if (isManga) { url = 'http://kissmanga.com/Manga/'; }
        else if (dub) { title += '-dub'; }
        return url + title;
    } else {
        return false;
    }
}