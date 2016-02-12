// ==UserScript==
// @name         KissMAL
// @namespace    https://raw.githubusercontent.com/itggot-josef-andersson/KissMAL/master/kissmal.js
// @version      1.5.4
// @description  Adds a link to kissanime.to next to every animetitle for easy anime watching.
// @author       Josef
// @match        http://myanimelist.net/animelist/*
// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @resource     MainCSS https://raw.githubusercontent.com/itggot-josef-andersson/KissMAL/master/resources/kissmal.css
// @resource     SettingsPopup https://raw.githubusercontent.com/itggot-josef-andersson/KissMAL/master/resources/settings.html
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==
/* jshint -W097 */

/*
TODO
- Add a KissMAL link to an anime's description page, not only in the mal list
*/

var config = {};
config.defaultLinkCss     = 'font-size: 10px; opacity: 0.8; margin-left: 3px; margin-right: 2px;';
config.linkCss            = GM_getValue('kissanime_link_css') || config.defaultLinkCss;
config.subLinkEnabled     = GM_getValue('sub_link_enable') != 'false';     // Defaults the value to true if it doesn't exist
config.dubLinkEnabled     = GM_getValue('dub_link_enable') != 'false';
config.generalLinkEnabled = GM_getValue('general_link_enable') != 'false';
config.newTab             = GM_getValue('open_in_new_tab') != 'false';

/* Add the css and the customized link css */
function addCSS() {
    var css = GM_getResourceText('MainCSS') + " .kissanime_link { " + config.linkCss + " }";
    GM_addStyle(css);
}

/* Add the settings popup element to DOM */
function addSettingsPopup() {
    /* Create and append the popup window itself */
    var container = document.createElement('div');
    container.id = 'kissmal_settings_container';
    container.innerHTML = GM_getResourceText('SettingsPopup');
    container.hidden = true;
    document.body.appendChild(container);

    /* Add event handlers for the settings checkboxes */
    $('#close_settings').click(function(e) { container.hidden = true; });
    $('#reset_settings').click(function(e) { resetSettings();         });
    $('#save_settings').click(function(e)  { saveSettings();          });

    /* Add the button that opens the settings popup */
    var settings = document.createElement('a');
    settings.href = '#';
    settings.innerHTML = 'Edit KissMAL settings';

    var settingsParent = $('#mal_cs_otherlinks').children('div')[1];
    settingsParent.innerHTML += '&nbsp;&nbsp;';
    settingsParent.appendChild(settings);

    /* Add event handler for the settings opening button */
    $(settings).click(function(e) {
        if (container.hidden) { // Container is refering to the settings window container in the DOM that was created above
            container.hidden = false;
            $('textarea#css').val(config.linkCss);
            $('#general_link_enable')[0].checked = config.generalLinkEnabled;
            $('#sub_link_enable')[0].checked     = config.subLinkEnabled;
            $('#dub_link_enable')[0].checked     = config.dubLinkEnabled;
            $('#open_in_new_tab')[0].checked     = config.newTab;
        }
    });
}

/* Add kissanime links to list */
function makeLinks() {
    /* Store the different types of kissanime links so that we can loop through them */
    var map = [[config.generalLinkEnabled, '', 'KissAnime'], [config.subLinkEnabled, ' (sub)', '(sub)'], [config.dubLinkEnabled, ' (dub)', '(dub)']];

    /* Loop through every title in the list to append the kissanime link after */
    $('.animetitle').each(function(index, element) {
        var parent = element.parentNode;
        var query = $(element).children('span')[0].innerHTML;

        /* Loop through the kissanime link types */
        for (var typeIndex in map) {
            var entry = map[typeIndex];
            if (entry[0] === true) {

                /* Append the link to the DOM */
                var link = document.createElement('a');
                link.href = 'http://thisisjusta.filler/' + query + entry[1];
                link.innerHTML = entry[2];
                link.className = 'kissanime_link';
                parent.appendChild(link);
                $(link).click(linkClicked);
            }
        }
    });
}

/* Remove kissanime links from list */
function removeLinks() {
    $('.kissanime_link').each(function(index, element) { element.remove(); });
}

/* The function that is called when a kissanime link is clicked */
function linkClicked(event) {
    event.preventDefault();
    var clicked = event.toElement;
    if (clicked) { sendToKissAnime(clicked.href.substring('http://thisisjusta.filler/'.length, clicked.href.length)); }
    return false;
}

/* Send the user to the kissanime website */
/* "search" is the string that will be sent as a search query */
function sendToKissAnime(search) {
    search = decodeURI(search);

    /* To redirect them with POST parameters we need to create a form and submit it */
    var form = document.createElement('form');
    form.action = 'https://kissanime.to/Search/Anime';
    form.method = 'POST';
    if (config.newTab) { form.target = '_blank'; } // Target = '_blank' will open in a new tab

    var input = document.createElement('input');
    input.type = 'text';
    input.name = 'keyword';
    input.value = search;

    /* Add the elements to DOM and submit it */
    form.appendChild(input);
    document.body.appendChild(form); // FF needs the form to be in the DOM
    form.submit();
}

/* Resets the settings in the settings popup to defualt (NOTE: The "save" button still has to be pressed for reset to take effect) */
function resetSettings() {
    $('textarea#css').val(config.defaultLinkCss);
    $('#general_link_enable')[0].checked = true;
    $('#sub_link_enable')[0].checked     = true;
    $('#dub_link_enable')[0].checked     = true;
    $('#open_in_new_tab')[0].checked     = true;
}

/* Saves the settings in the settings popup */
function saveSettings() {
    config.linkCss = $('textarea#css').val();
    config.generalLinkEnabled = $('#general_link_enable')[0].checked;
    config.subLinkEnabled     = $('#sub_link_enable')[0].checked;
    config.dubLinkEnabled     = $('#dub_link_enable')[0].checked;
    config.newTab             = $('#open_in_new_tab')[0].checked;

    /* Save settings to storage */
    GM_setValue('kissanime_link_css',  config.linkCss);
    GM_setValue('general_link_enable', config.generalLinkEnabled + '');
    GM_setValue('sub_link_enable',     config.subLinkEnabled + '');
    GM_setValue('dub_link_enable',     config.dubLinkEnabled + '');
    GM_setValue('open_in_new_tab',     config.newTab + '');

    /* Re-do the links with new settings applied */
    removeLinks();
    makeLinks();
}

/* Add the things */
addCSS();
addSettingsPopup();
makeLinks();
