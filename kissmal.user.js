// ==UserScript==
// @name         KissMAL
// @namespace    https://github.com/josefandersson/KissMAL
// @version      1.7.1
// @description  Adds a link to kissanime.to next to every animetitle for easy anime watching.
// @author       Josef
// @match        http://myanimelist.net/animelist/*
// @match        http://myanimelist.net/anime/*
// @require      https://code.jquery.com/jquery-2.1.4.min.js
// @resource     MainCSS https://github.com/josefandersson/KissMAL/raw/master/resources/kissmal.css
// @resource     SettingsPopup https://github.com/josefandersson/KissMAL/raw/master/resources/settings.html
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

var config = {};
var linkTypeMap;
var site;
var designType;

(function() {
    /* Get saved settings (or set default) */
    config.defaultLinkCss     = 'font-size: 10px; opacity: 0.8; margin-left: 3px; margin-right: 2px;';
    config.linkCss            = GM_getValue('kissanime_link_css') || config.defaultLinkCss;
    config.subLinkEnabled     = GM_getValue('sub_link_enable') != 'false';     // Defaults the value to true if it doesn't exist
    config.dubLinkEnabled     = GM_getValue('dub_link_enable') != 'false';
    config.generalLinkEnabled = GM_getValue('general_link_enable') != 'false';
    config.newTab             = GM_getValue('open_in_new_tab') != 'false';

    /* Check what page we are on */
    var url = window.location.href;
    if (/(http:\/\/myanimelist.net\/animelist\/)/.test(url))  site = 'animelist';
    else if (/(http:\/\/myanimelist.net\/anime\/)/.test(url)) site = 'anime';

    /* Since the new list design we need to know if the animelist we are viewing is updated or not */
    if (site == 'animelist') {
        if ($('#mal_cs_otherlinks').length > 0) designType = 0; // If the mal_cs_otherlinks div exists we know we are viewing the old design
        else                                    designType = 1;
    }

    /* Inject css to the page */
    var css = GM_getResourceText('MainCSS') + ' .kissanime_link { ' + config.linkCss + ' }';
    GM_addStyle(css);

    /* Make the links */
    if (site == 'anime')          { makeLinksForAnimePage();           }
    else if (site == 'animelist') { makeLinks(); makeSettingsWindow(); }
})();

function makeSettingsWindow() {
    /* Create and append the popup window itself */
    var container = $('<div></div>').attr('id', 'kissmal_settings_container').html(GM_getResourceText('SettingsPopup')).attr('hidden', true).appendTo($(document.body));

    /* Add event handlers for the settings checkboxes */
    $('#close_settings').click(function(e) { container.attr('hidden', true); });
    $('#reset_settings').click(function(e) { resetSettings();                });
    $('#save_settings').click(function(e)  { saveSettings();                 });

    /* Create the button that opens the settings window */
    var settings = $('<a></a>').attr('href', '#').html('Edit KissMAL settings');

    /* Add the button to the DOM */
    if (designType == 1) {
        var headerInfo = $('.header-info');
        headerInfo.html(headerInfo.html() + ' - ');
        settings.appendTo(headerInfo);
    } else if (designType === 0) {
        $('#mal_cs_otherlinks').children('div').last().append(settings);
    }

    /* Add event handler for the settings opening button */
    $(settings).click(function(e) {
        if (container.attr('hidden')) { // Container is refering to the settings window container in the DOM that was created above
            container.attr('hidden', false);
            $('textarea#css').val(config.linkCss);
            $('#general_link_enable')[0].checked = config.generalLinkEnabled;
            $('#sub_link_enable')[0].checked     = config.subLinkEnabled;
            $('#dub_link_enable')[0].checked     = config.dubLinkEnabled;
            $('#open_in_new_tab')[0].checked     = config.newTab;
        }
    });
}

/* Remove all kissanime links */
function removeLinks() {
    $('.kissanime_link').each(function(index, element) { element.remove(); });
}

/* Create the links for the anime list page */
function makeLinks() {
    /* The different kinds of links that can be created. Second item in array is the extra string that will be appended to the search query. */
    linkTypeMap = [[config.generalLinkEnabled, '', 'KissAnime'], [config.subLinkEnabled, ' (sub)', '(sub)'], [config.dubLinkEnabled, ' (dub)', '(dub)']];

    /* If the list is using the new design */
    if (designType == 1) {
        $('td.title').each(function(index, element) {
            var elementAfter = $(element).children('div.add-edit-more');
            var query        = ($(element).children('a').text() + '').slice(11, -8);

            /* Loop through the different type of search links */
            for (var typeIndex in linkTypeMap) {
                var entry = linkTypeMap[typeIndex];
                if (entry[0] === true) {
                    /* Create link and add it to the DOM */
                    var link = $('<a></a>').attr('href', 'http://thisisjusta.filler/' + query + entry[1])
                        .html(entry[2]).addClass('kissanime_link')
                        .insertBefore(elementAfter);
                }
            }
        });
    }

    /* If the list is using the old design */
    else if (designType === 0) {
        $('.animetitle').each(function(index, element) {
            var parent = $(element.parentNode);
            var query  = $(element).children('span').first().text();

            /* Loop through the different type of search links */
            for (var typeIndex in linkTypeMap) {
                var entry = linkTypeMap[typeIndex];
                if (entry[0] === true) {
                    /* Create link and add it to the DOM */
                    var link = $('<a></a>').attr('href', 'http://thisisjusta.filler/' + query + entry[1])
                        .html(entry[2]).addClass('kissanime_link').appendTo(parent);
                }
            }
        });
    }

    /* Add the event handler */
    $(document).on('click', '.kissanime_link', linkClicked);
}

/* Create the links for the anime description page */
function makeLinksForAnimePage() {
    /* The different kinds of links that can be created. Second item in array is the extra string that will be appended to the search query. */
    linkTypeMap = [[config.generalLinkEnabled, '', 'KissAnime'], [config.subLinkEnabled, ' (sub)', '(sub)'], [config.dubLinkEnabled, ' (dub)', '(dub)']];

    /* We need the title of the anime */
    var animeTitle = $('h1.h1 span').text();

    /* We will put the links inside this div */
    var linkContainer = $('<div>', {class: 'kissmal_link_container'});

    /* Loop through the kissanime link types */
    for (var typeIndex in linkTypeMap) {
        var entry = linkTypeMap[typeIndex];
        if (entry[0] === true) {
            /* Create link and append it to the DOM */
            var link = $('<a></a>').attr('href', 'http://thisisjusta.filler/' + animeTitle + entry[1]).html(entry[2]).addClass('kissanime_link');
            linkContainer.append(link);
        }
    }

    /* We place the links below the anime profile image */
    $(linkContainer).insertAfter($('#content > table > tbody > tr > td.borderClass > div.js-scrollfix-bottom').children().first());

    /* Add the event handler */
    $(document).on('click', '.kissanime_link', linkClicked);
}

/* The function that is called when a kissanime link is clicked */
function linkClicked(event) {
    event.preventDefault();
    var element = event.toElement || event.target;
    if (element) sendToKissAnime(element.href.substring(26));
}

/* Send the user to the kissanime website */
/* "search" is the string that will be sent as a search query */
function sendToKissAnime(search) {
    search = decodeURI(search);

    /* To redirect them with POST parameters we need to create a form and submit it */
    var form  = $('<form>',  { action: 'https://kissanime.to/Search/Anime', method: 'POST', hidden: true, target: config.newTab ? '_blank' : undefined });
    var input = $('<input>', { type: 'text', name: 'keyword', value: search });

    /* Add the elements to DOM and submit it */
    form.append(input);
    $(document.body).append(form); // FF needs the form to be in the DOM
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
    /* Get values from inputs */
    config.linkCss            = $('textarea#css').val();
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
