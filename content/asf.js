/* ***** BEGIN LICENSE BLOCK *****
Automatic Save Folder
Copyright (C) 2007-2012 Éric Cassar (Cyan).

    "Automatic Save Folder" is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 2 of the License, or
    (at your option) any later version.

    "Automatic Save Folder" is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with "Automatic Save Folder".  If not, see <http://www.gnu.org/licenses/>.

 * ***** END LICENSE BLOCK ***** */
var automatic_save_folder = {
		prefManager: Components.classes["@mozilla.org/preferences-service;1"]
							.getService(Components.interfaces.nsIPrefBranch),

		appInfo: Components.classes["@mozilla.org/xre/app-info;1"]
	                        .getService(Components.interfaces.nsIXULAppInfo),

		versionChecker: Components.classes["@mozilla.org/xpcom/version-comparator;1"]
	                               .getService(Components.interfaces.nsIVersionComparator),
								   
		stringbundle: Components.classes["@mozilla.org/intl/stringbundle;1"]
                   .getService(Components.interfaces.nsIStringBundleService)
                   .createBundle("chrome://asf/locale/asf.properties"),
				
		firefoxversion : "",
		ASF_VERSION: "",
		
	asf_load: function () {
		
		this.checkFirefoxVersion();
		
		
		// init the preference for firefox 3+
		if (this.firefoxversion >= "3")
		{
			// set lastdir to "enable" if the user just updated from previous version and had it disabled
			var lastdir = document.getElementById("asf-lastdir");
			lastdir.checked = true;
			lastdir.hidden = true; // hidden on FF3, as lastdir must always be true, don't allow the user to disable it.
			this.prefManager.setBoolPref("extensions.asf.lastdir", true);
		}
		
		
		this.asf_getdomain(); // Run this to get the current domain and filename from the download window to pre-fill the fields in "add filter".
		this.asf_loadpref();  // Load the preferences
		this.asf_loadFilters();  // Load the filter's array content
		this.asf_treeSelected(); // set the button to disabled state because no filter is selected when openning
		this.asf_toggleradio(); // set the radio choice to the right place
		this.asf_variablemode(); // check if variable mode is on or off, and change mode if needed
		// if(this.prefManager.getBoolPref("extensions.asf.autoCheckBetaUpdate")) this.checkBetaVersion(true); // Check the latest available (beta) version
		
		// Resize the preferences window to match the localization needs.
		// I don't know why width, or css width are not working, so let's use a script to resize the preferences window on load.
		// Check the current preferences window size stored by the user, if bigger then don't resize.
		var target_width = 617; // default sizes
		var target_height = 423;
		var asf_pref_window = document.getElementById("asf_pref");
		var locale_width = parseInt(document.getElementById("asf-preferences-window-width").value);
		var locale_height = parseInt(document.getElementById("asf-preferences-window-height").value);
		var resize = document.getElementById("asf-preferences-window-resize").value;
		if (resize == "true") // new size defined by locale.
		{
			target_width = target_width > locale_width ? target_width : locale_width;
			target_height = target_height > locale_height ? target_height : locale_height;
		}
		asf_pref_window.width = asf_pref_window.width > target_width ? asf_pref_window.width : target_width;
		asf_pref_window.height = asf_pref_window.height > target_height ? asf_pref_window.height : target_height;
		
		//Detect OS
		// var OSName="Unknown OS";
		// if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
		// if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
		// if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
		// if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";
		
		// alert('Your OS: '+OSName);
		// alert(navigator.appVersion.indexOf("Win"));
		
	},


	asf_loadpref: function () {
		//load the default folder (I removed the preference in options.xul, unicode folder's name didn't saved at all with automatic preference management. 
		// 							Manual saving is working, but not saving in the right encoding type in prefs.js, so we need to use get/setComplexValue)
		var default_folder = document.getElementById("asf-default-folder");
		default_folder.value = this.loadUnicodeString("extensions.asf.defaultfolder");
		
		var exportFolder = document.getElementById("asf-exportFolder");
		exportFolder.value = this.loadUnicodeString("extensions.asf.exportFolder");
		
		// export button
		var showExportButton = document.getElementById("asf-showExportButton");
		var exportButton = document.getElementById("asf-filter-export");
		exportButton.hidden = !showExportButton.checked;
	},


	asf_loadFilters: function () {
		var nbrRow = this.prefManager.getIntPref("extensions.asf.filtersNumber", 0);
			
		// ensure there's no filters already listed in the treeview
		for (var i=document.getElementById('asf-filterChilds').childNodes.length-1 ; i>=0 ; i--)
		{
			document.getElementById('asf-filterChilds').removeChild(document.getElementById('asf-filterChilds').childNodes[i]);
		}
		// insert the filters in the treeview
		for ( var i = 0 ; i < nbrRow ; i++)
		{
			var domain = this.loadUnicodeString("extensions.asf.filters"+ i +".domain");
			var filename = this.loadUnicodeString("extensions.asf.filters"+ i +".filename");
			var folder = this.loadUnicodeString("extensions.asf.filters"+ i +".folder");
			var active = this.prefManager.getBoolPref("extensions.asf.filters"+ i +".active");
			var domain_regexp = this.prefManager.getBoolPref("extensions.asf.filters"+ i +".domain_regexp");
			var filename_regexp = this.prefManager.getBoolPref("extensions.asf.filters"+ i +".filename_regexp");
			
			// adding into the tree
			var filter = document.getElementById('asf-filterList');
			var rules = document.getElementById('asf-filterChilds');
			var item = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treeitem');
			var row = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treerow');
			var c1 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c2 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c3 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c4 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c5 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c6 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			c1.setAttribute('label', domain);
			c2.setAttribute('label', filename);
			c3.setAttribute('label', folder);
			c4.setAttribute('value', active);
			c5.setAttribute('value', domain_regexp);
			c6.setAttribute('value', filename_regexp);
			c1.setAttribute('editable', false);
			c2.setAttribute('editable', false);
			c3.setAttribute('editable', false);
			c5.setAttribute('editable', false);
			c6.setAttribute('editable', false);
			row.appendChild(c1);
			row.appendChild(c2);
			row.appendChild(c3);
			row.appendChild(c4);
			row.appendChild(c5);
			row.appendChild(c6);
			item.appendChild(row);
			
			rules.appendChild(item);
			
		}
		
		// set the row's color
		this.set_row_color(true);
	},


	save_active_state: function() {
		//autosave the filters when clicking (anywhere) on the filter tree
		// can't detect the "active" column statut with setting an attribute. The event is set to the tree not the cell.
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		if (instantApply)
		{
			//save the filters
			this.asf_savefilters();
		}
		
		// set the row's color
		this.set_row_color();
	},


	// Called whenever a list box is selected
	asf_treeSelected: function () {
		var deleteButton   = document.getElementById("asf-delete");
		var editButton     = document.getElementById("asf-edit");
		var listBox        = document.getElementById("asf-filterList");
		var listchilds     = document.getElementById("asf-filterChilds");
		var moveDownButton = document.getElementById("asf-move-down");
		var moveUpButton   = document.getElementById("asf-move-up");
		var selectedIndex  = listBox.currentIndex ; 		//number of the selected line in tree
		
		var nbrRow = listBox.view.rowCount;
		
		
		// If an item is selected
		if(selectedIndex >= 0)
		{
			deleteButton.disabled   = false;
			deleteButton.image   = "chrome://asf/skin/delete.png";
			editButton.disabled     = false;
			
			// If this is the first item
			if(selectedIndex == 0)
			{
				moveUpButton.disabled = true;
				moveUpButton.image = "chrome://asf/skin/up_disabled.png";
			}
			else
			{
				moveUpButton.disabled = false;
				moveUpButton.image = "chrome://asf/skin/up.png";
			}
			
			// If this is the last item
			if(selectedIndex == nbrRow - 1)
			{
				moveDownButton.disabled = true;
				moveDownButton.image   = "chrome://asf/skin/down_disabled.png";
			}
			else
			{
				moveDownButton.disabled = false;
				moveDownButton.image   = "chrome://asf/skin/down.png";	
			}
		}
		else
		{
			editButton.disabled     = true;
			deleteButton.disabled   = true;
			deleteButton.image   = "chrome://asf/skin/delete_disabled.png";
			moveDownButton.disabled = true;
			moveDownButton.image   = "chrome://asf/skin/down_disabled.png";
			moveUpButton.disabled   = true;
			moveUpButton.image = "chrome://asf/skin/up_disabled.png";
		}
		this.set_row_color();
	},


	set_row_color: function (FirstTime) {
	
		if (window.opener.location == "chrome://mozapps/content/downloads/unknownContentType.xul")
		{
			
		// Load current file info (source, location and current website URL)
			var filename = document.getElementById("asf-currentDL-filename").value;
			var domain = document.getElementById("asf-currentDL-domain").value;
			var fileURL = document.getElementById("asf-currentDL-fileURL").value;
			var fileURLAndFilename = document.getElementById("asf-currentDL-fileURLAndFilename").value;
			var currentDomain = document.getElementById("asf-currentDL-currentDomain").value;
			var currentURL = document.getElementById("asf-currentDL-currentURL").value;
			
			var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						   .getService(Components.interfaces.nsIWindowMediator);
			var mainWindow = wm.getMostRecentWindow("navigator:browser");
			var tabURL = mainWindow.gURLBar.value;
			var tabGroupName = this.getActiveGroupName();
			var currentReferrer = mainWindow.gBrowser.mCurrentTab.linkedBrowser.contentDocument.referrer;

			
			var treename = "asf-filterList";
			var tree = document.getElementById(treename);
			var maxidx = tree.view.rowCount;
			var dom, fil, fol, act, color, dom_regexp, file_regexp ;
			var found = false;
			
			for ( var idx = 0; idx < maxidx ; idx++)
			{
		// read current row data
				dom = tree.view.getCellText(idx,tree.columns.getColumnAt(0));
				fil = tree.view.getCellText(idx,tree.columns.getColumnAt(1));
				fol = tree.view.getCellText(idx,tree.columns.getColumnAt(2));
				act = tree.view.getCellValue(idx,tree.columns.getColumnAt(3));
				act = (act == "true" ? true : false) ;
				
		//Check filters here (see asf_download.js for source comments)
				dom_regexp = false ; // reset the matching string for the "for" loop
				file_regexp = false ; // same as above
				
				var domain_testOrder = document.getElementById("asf-domainTestOrder").value;
				if (this.trim(domain_testOrder) == "") domain_testOrder = "1,5";
				domain_testOrder = domain_testOrder.split(/,/);
				
				for ( var j = 0 ; j < domain_testOrder.length ; j++)
				{
					switch (this.trim(domain_testOrder[j])) 
					{
						case "1":
							dom_regexp = this.test_regexp(dom, domain, idx, "domain");
							break;
						case "2":
							dom_regexp = this.test_regexp(dom, fileURL, idx, "domain");
							break;
						case "3":
							dom_regexp = this.test_regexp(dom, fileURLAndFilename, idx, "domain");
							break;
						case "4":
							dom_regexp = this.test_regexp(dom, currentDomain, idx, "domain");
							break;
						case "5":
							dom_regexp = this.test_regexp(dom, currentURL, idx, "domain");
							break;
						case "6":
							dom_regexp = this.test_regexp(dom, currentReferrer, idx, "domain");
							break;
						case "7":
							dom_regexp = this.test_regexp(dom, tabURL, idx, "domain");
						case "8":
							dom_regexp = this.test_regexp(dom, tabGroupName, idx, "domain");
						default:
					}
					
					if (dom_regexp) break;
				}
				file_regexp = this.test_regexp(fil, filename, idx, "filename"); // Filename
				
				
			//set or remove Attribute color
				color = (act == true ? "FilterTestPass" : "FilterTestFail");
				var currentitem = tree.treeBoxObject.view.getItemAtIndex(idx);
				
				if (dom_regexp && file_regexp)
				{
					currentitem.firstChild.setAttribute('properties', color); 
					currentitem.firstChild.children[0].removeAttribute('properties');
					currentitem.firstChild.children[1].removeAttribute('properties');
					currentitem.firstChild.children[2].removeAttribute('properties');
					
					// Autoselect the first matching filter.
					if (FirstTime && !found)
					{
						tree.view.selection.select(idx);
						tree.treeBoxObject.ensureRowIsVisible(idx);
						found = true;
					}
				}
				else
				{
					currentitem.firstChild.removeAttribute('properties'); 
					currentitem.firstChild.children[0].removeAttribute('properties');
					currentitem.firstChild.children[1].removeAttribute('properties');
					currentitem.firstChild.children[2].removeAttribute('properties');
				}
			}
			
			// rowmatchinghighlight : color = keep the colored row even if selected | system = revert back to system highlight color if selected
			var rowmatchinghighlight = this.readHiddenPref("extensions.asf.rowmatchinghighlight", "char", "color");	// let the user choose in next release.
			if (rowmatchinghighlight == "color")
			{
				// enable this to set black border to the selected colored row
				if((tree.currentIndex > -1) && (tree.view.getItemAtIndex(tree.currentIndex).firstChild.hasAttribute('properties')) )
				{
					currentitem = tree.view.getItemAtIndex(tree.currentIndex);
					color = currentitem.firstChild.getAttribute('properties');
					if (color == "FilterTestPass") 
					{
						currentitem.firstChild.setAttribute('properties', "FilterTestPassSelected");
						currentitem.firstChild.children[0].setAttribute('properties', "FilterTestPassSelected");
						currentitem.firstChild.children[1].setAttribute('properties', "FilterTestPassSelected");
						currentitem.firstChild.children[2].setAttribute('properties', "FilterTestPassSelected");
					}
					if (color == "FilterTestFail")
					{
						currentitem.firstChild.setAttribute('properties', "FilterTestFailSelected");
						currentitem.firstChild.children[0].setAttribute('properties', "FilterTestFailSelected");
						currentitem.firstChild.children[1].setAttribute('properties', "FilterTestFailSelected");
						currentitem.firstChild.children[2].setAttribute('properties', "FilterTestFailSelected");
					}
				}
			}
			else // enable this to remove the color of the selected item
			{
				if((tree.currentIndex > -1) && (tree.view.getItemAtIndex(tree.currentIndex).firstChild.hasAttribute('properties')) )
				{
					currentitem = tree.view.getItemAtIndex(tree.currentIndex);
					currentitem.firstChild.removeAttribute('properties');
				}
			}
		}
	},


	test_regexp: function (filter_data, downloaded_data, idx, filter_type) {
	/**
	// filter_data (String) : The filter's content
	// downloaded_data (String) : The downloaded filename or domain informations
	// idx (Int) : Current filter number
	// filter_type (String) : Current filter type, can be "domain" of "filename".
	// Return (Bool) : return true if the current filter matches.
	*/
		// Convert normal filter to regular expression filter.
		var isregexp = false;
		if(idx >= 0)
		{
			var tree = document.getElementById("asf-filterList");
			if (filter_type == "domain") isregexp = tree.view.getCellValue(idx,tree.columns.getColumnAt("4"));
			if (filter_type == "filename") isregexp = tree.view.getCellValue(idx,tree.columns.getColumnAt("5"));
			isregexp = isregexp == "true" ? true : false;
		}
		if (isregexp == false) // replace simple wildcard and special characters with corresponding regexp
		{
			filter_data = filter_data.replace(/\./gi, "\\.")
													.replace(/\*/gi, ".*")
													.replace(/\$/gi, "\\$")
													.replace(/\^/gi, "\\^")
													.replace(/\+/gi, "\\+")
													.replace(/\?/gi, ".")
													.replace(/\|/gi, "\\|")
													.replace(/\[/gi, "\\[")
													.replace(/\//gi, "\\/");
			filter_data = ".*"+filter_data+".*";
		}
		
		// initialize the regular expression search
		var param = (document.getElementById("asf-regexp_caseinsensitive").checked == true ? "i" : "");
		var test = new RegExp(filter_data, param);
		
		if (downloaded_data.match(test)) // if something match
		{
			return(true);
		}
		return(false);
	},


	is_regexp: function (string) {
		if ((string.substring(0,1) == "/") && (string.substr(string.length - 1, 1) == "/"))
		{
			return true;
		}
		else
		{
			return false;
		}
	},


	asf_toggleradio: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		var select_last_radio = document.getElementById("asf-last-radio");
		var select_choose_radio = document.getElementById("asf-choose-radio");
		var select_folder_input = document.getElementById("asf-default-folder");
		var select_folder_btn = document.getElementById("asf-select-folder");
		var select_keeptemp_chk = document.getElementById("asf-keeptemp-check");
		var useSiteBySiteSavePath = document.getElementById("asf-useSiteBySiteSavePath");
		
		if(select_last_radio.selected == true)
		{
			select_folder_input.disabled   = true;
			select_folder_btn.disabled   = true;
			select_keeptemp_chk.disabled = true;
			useSiteBySiteSavePath.disabled = false;
		}
		
		if(select_choose_radio.selected == true)
		{
			select_folder_input.disabled = false;
			this.asf_variablemode();
			select_folder_btn.disabled   = false;
			select_keeptemp_chk.disabled = false;
			useSiteBySiteSavePath.checked = false;
			useSiteBySiteSavePath.disabled = true;
		}
		
		if(this.firefoxversion < 7.01)
		{
			useSiteBySiteSavePath.hidden = true;

		}
		if (instantApply) // bug with sub-options status set by javascript
		{
			this.asf_saveoptions();
		}
	},


	toggle_options: function () {  // called whenever the Options tab is selected
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		var viewdloption = document.getElementById("asf-viewdloption");
		var viewdloptionType = document.getElementById("asf-viewdloptionType");
		var suggestAllPossibleFolders = document.getElementById("asf-suggestAllPossibleFolders");
		var viewpathlist = document.getElementById("asf-viewpathselect");
		var dialogaccept = document.getElementById("asf-dialogaccept");
		var dialogacceptFiltered = document.getElementById("asf-dialogacceptFiltered");
		var dialogForceRadio_Start = document.getElementById("asf-dialogForceRadio_Start");
		var dialogForceRadio_End = document.getElementById("asf-dialogForceRadio_End");
		var dialogForceRadioTo = document.getElementById("asf-dialogForceRadioTo");
		var useDownloadDir = document.getElementById("asf-useDownloadDir");
		var asf_userightclick = document.getElementById("asf-userightclick");
		var asf_rightclicktimeout = document.getElementById("asf-rightclicktimeout");
		
		// check if autosave is selected, if not : set the saving path to "filtered" and disable the dropdown menu.
		if (useDownloadDir.value == "false")
		{
			document.getElementById("asf-folderList").value = 2;
			document.getElementById("asf-folderList").disabled = true;
			this.prefManager.setIntPref("browser.download.folderList",2);
			document.getElementById("asf-useDownloadDirFiltered").checked = false;
			document.getElementById("asf-useDownloadDirFiltered").disabled = true;
		}
		if (useDownloadDir.value == "true")
		{
			document.getElementById("asf-folderList").disabled = false;
			document.getElementById("asf-useDownloadDirFiltered").disabled = false;
		}
		
		
		// set the sub-dialogaccept option to grey state
		if (dialogaccept.checked == false)
		{
			dialogacceptFiltered.checked = false;
			dialogacceptFiltered.disabled = true;
			dialogForceRadio_Start.checked = false;
			dialogForceRadio_Start.disabled = true;
			dialogForceRadio_End.disabled = true;
			dialogForceRadioTo.disabled = true;
		}
		if (dialogaccept.checked == true)
		{
			dialogacceptFiltered.disabled = false;
			dialogForceRadio_Start.disabled = false;
			dialogForceRadio_End.disabled = false;
			dialogForceRadioTo.disabled = false;
		}
		
		// and fill the forceRadioTo menuItems
			var forceRadioTo = this.prefManager.getCharPref("extensions.asf.dialogForceRadioTo");
			if (this.DownThemAll_isEnabled())
			{
				document.getElementById("asf-dialogForceRadioToDownthemall").style.display = "block";
				document.getElementById("asf-dialogForceRadioToTurbodta").style.display = "block";
			}
			if (!this.DownThemAll_isEnabled() && (forceRadioTo == "downthemall" || forceRadioTo == "turbodta")) this.prefManager.setCharPref("extensions.asf.dialogForceRadioTo","save"); // default to "Save File" if DTA is uninstalled.
		
		
		// if the option window is opened from the saving window, disable the autosave feature (Not working when set from here.)
		if (window.opener.location == "chrome://mozapps/content/downloads/unknownContentType.xul")
		{
			dialogaccept.disabled = true;
			dialogacceptFiltered.disabled = true;
		}
		
		
		// set the sub-D/L option to grey state
		if (viewdloption.checked == false)
		{
			viewdloptionType.disabled = true;
			viewpathlist.checked = false;
			viewpathlist.disabled = true;
			suggestAllPossibleFolders.checked = false;
			suggestAllPossibleFolders.disabled = true;
		}
		if (viewdloption.checked == true)
		{
			viewdloptionType.disabled = false;
			viewpathlist.disabled = false;
			suggestAllPossibleFolders.disabled = false;
		}
		
		// set the sub-rightclick option to grey state
		if (asf_userightclick.checked == false)
		{
			asf_rightclicktimeout.disabled = true;
		}
		if (asf_userightclick.checked == true)
		{
			asf_rightclicktimeout.disabled = false;
		}
		
		// Check the right-click feature here, and prints text according to Firefox version and active addons
		// hide all the descriptions box, and unhide the needed one 
		document.getElementById("asf-rightclickdesc-ff2").hidden = true;     // Firefox 2, Right-click disabled message
		document.getElementById("asf-rightclickdesc-DSort").hidden = true;   // Download sort conflit alert
		
		if (this.firefoxversion == 2)
		{
			document.getElementById("asf-userightclick").hidden = true;       // Hide the right-click checkbox
			document.getElementById("asf-rightclicktimeout").hidden = true;   // Hide the right-click timeout checkbox
			document.getElementById("asf-rightclickdesc-ff2").hidden = false; // Show right-click not working on Firefox 2.0
		}
		if (this.firefoxversion >= 3)
		{
			if (this.DownloadSort_isEnabled()) // if Download sort is installed, display a message "right click disabled"
			{
				asf_userightclick.disabled = true;
				asf_rightclicktimeout.disabled = true;
				
				document.getElementById("asf-rightclickdesc-DSort").hidden = false;
			}
			
			if (this.DownThemAll_isEnabled()) // if DownThemall is installed, show the DTA sub-tab in the option's tab
			{
				document.getElementById("asf-optionssubtab-dta").hidden = false;
			}
		}
		
		if (instantApply) // bug with sub-options status set by javascript
		{
			this.asf_saveoptions();
		}
	},


	toggle_userightclick: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		var asf_userightclick = document.getElementById("asf-userightclick");
		var asf_rightclicktimeout = document.getElementById("asf-rightclicktimeout");
		
		// set the sub-rightclick option to grey state
		if (asf_userightclick.checked == false)
		{
			asf_rightclicktimeout.checked = false;
			asf_rightclicktimeout.disabled = true;
		}
		if (asf_userightclick.checked == true)
		{
			asf_rightclicktimeout.disabled = false;
			asf_rightclicktimeout.checked = true;
		}
		
		if (instantApply) // bug with sub-options status set by javascript
		{
			this.asf_saveoptions();
		}
		
	},


	toggle_rightclicktimeout: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		
		if (instantApply)
		{
			var asf_rightclicktimeout = document.getElementById("asf-rightclicktimeout").checked;
			this.prefManager.setIntPref("browser.download.saveLinkAsFilenameTimeout", asf_rightclicktimeout == true ? 0 : 1000 );
		}
	},


	asf_selecttab: function(tabID) {
		
		// Use this system for tab, because css for tab is not the same color as config window color, and I don't want to force any color by default so user can use new firefox theme's colors.
		document.getElementById("asf-tab-filters").hidden = true;
		document.getElementById("asf-tab-options").hidden = true;
		document.getElementById("asf-tab-help").hidden = true;
		document.getElementById("asf-tab-about").hidden = true;
		
		
		document.getElementById(tabID).hidden = false;  
		if(tabID == "asf-tab-options") this.toggle_options();
		if(tabID == "asf-tab-filters") this.set_row_color();
		//window.sizeToContent();
	},


	asf_variablemode: function() {
		var select_variable_mode = document.getElementById("asf-variablemode");
		var select_folder_input = document.getElementById("asf-default-folder");
		
		if(select_variable_mode.checked == true)
		{
			select_folder_input.readOnly   = false;
		}
		if(select_variable_mode.checked == false)
		{
			select_folder_input.readOnly   = true;
		}
		
		
	},


	asf_getdomain: function () {  // Save the domain and filename in a hidden field, to be used by the "add" button for auto-complete field.
		if (window.opener.location == "chrome://mozapps/content/downloads/unknownContentType.xul")  // if the option is opened from the saving window
		{
			var tBrowser = Components.classes["@mozilla.org/appshell/window-mediator;1"]
				 .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser").getBrowser();
			var tabLocation = tBrowser.mCurrentTab.linkedBrowser.contentDocument.location;
			var filename = 			window.opener.document.getElementById("location").value ;
			var domain = 			window.opener.document.getElementById("source").value ;
			var fileURL = 			window.opener.document.getElementById("source").getAttribute("tooltiptext");
			var fileURLAndFilename= window.opener.document.getElementById("source").getAttribute("tooltiptext") + filename;
			var currentDomain, currentURL = "";
			try 
			{
				currentDomain = 	tabLocation.protocol + "//" + tabLocation.host; // look for the current website URL in the DOM.
				currentURL = 		tabLocation.href; // look for the current website URL in the DOM.
			}
			catch (e) // if there is no data (The tab is closed or it's a script redirection), use the file's data.
			{
				currentDomain = domain;
				currentURL = fileURL;
			}
			
			document.getElementById("asf-currentDL-filename").value = filename;
			document.getElementById("asf-currentDL-domain").value = domain;
			document.getElementById("asf-currentDL-fileURL").value = fileURL;
			document.getElementById("asf-currentDL-fileURLAndFilename").value = fileURLAndFilename;
			document.getElementById("asf-currentDL-currentDomain").value = currentDomain;
			document.getElementById("asf-currentDL-currentURL").value = currentURL;
		}
	},


	// Code from captain.at, modified by Cyan (CASSAR Eric)
	move: function (direction) {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		var treename = "asf-filterList";
		
		var tree = document.getElementById(treename);
		var idx = tree.currentIndex;
		if (idx == -1) return false;
		
		var dir = 1;
		if ((direction == "up") || (direction == "top"))
		{
			dir = -1;
		}
		var currentitem = tree.treeBoxObject.view.getItemAtIndex(idx);
		var parent = currentitem.parentNode;
		if ((direction == "up") || (direction == "down"))  // read the next or previous entry only if function is called from the button clic (not from the popup choice)
		{
			var previousitem = tree.treeBoxObject.view.getItemAtIndex(idx + dir); 
		}
		
		
		if (direction == "up") 
		{
			parent.insertBefore(currentitem, previousitem);
			tree.view.selection.select(idx-1); // reselect the last
		} 
		else if (direction == "down")
		{
			parent.insertBefore(previousitem, currentitem);
		}
		
		if (direction == "top")
		{
			while (currentitem.previousSibling)
			{
				this.move("up");
			}
		}
		else if (direction == "bottom")
		{
			while (currentitem.nextSibling)
			{
				this.move("down");
			}
		}
		
		idx = tree.currentIndex;
		tree.treeBoxObject.ensureRowIsVisible(idx);
		
		//autosave when moving filters
		if (instantApply)
		{
			//save the filters
			this.asf_savefilters();
		}
		return false;
	},


	dragstart: function(event) {
		var treename = "asf-filterList";
		var tree = document.getElementById(treename);
		var idx  = tree.currentIndex; //number of the selected line in tree
		var currentitem = tree.treeBoxObject.view.getItemAtIndex(idx);
		
		//event.dataTransfer.setData('application/x-moz-node', currentitem);  // send node data
		event.dataTransfer.setData('user/define', idx);  // send index data as text (but to prevent drop on text field, let's use custom set)
		event.dataTransfer.effectAllowed = "move copy";
		event.dataTransfer.dropEffect = "move copy";
	},


	dragover: function (event) {
		//var isNode = event.dataTransfer.types.contains("application/x-moz-node");
		var isDefine = event.dataTransfer.types.contains("user/define");
		if (isDefine)
		{
			event.preventDefault();
			event.dataTransfer.effectAllowed = "move copy";
			event.dataTransfer.dropEffect = "move copy";
			
			// Show target indicator
			if (event.dataTransfer.dropEffect == "copy")
			{
				var treename = "asf-filterList";
				var tree = document.getElementById(treename);
				var targetitem_idx = tree.treeBoxObject.getRowAt(event.pageX, event.pageY);
				var maxidx = tree.view.rowCount;
				if (targetitem_idx == -1) targetitem_idx = maxidx-1;
				
				var currentitem = tree.treeBoxObject.view.getItemAtIndex(targetitem_idx);
				var parent = currentitem.parentNode;
				
				for (var i = 0; i < maxidx; i++)
				{
					tree.view.getItemAtIndex(i).firstChild.setAttribute('properties', "FilterDragCopy_remove");
				}
				
				currentitem.firstChild.setAttribute('properties', "FilterDragCopy_set");
			}
		}
	},


	dragdrop: function (event) {
		//var currentitem = event.dataTransfer.getData("application/x-moz-node");
		//var currentitem_idx = event.dataTransfer.getData("text/plain");
		var currentitem_idx = event.dataTransfer.getData("user/define");
		if (currentitem_idx!="")
		{
			var treename = "asf-filterList";
			var tree = document.getElementById(treename);
			var currentitem = tree.treeBoxObject.view.getItemAtIndex(currentitem_idx);
			
			var targetitem_idx = tree.treeBoxObject.getRowAt(event.pageX, event.pageY);
			var maxidx = tree.view.rowCount;
			if (targetitem_idx == -1) targetitem_idx = maxidx-1;
			var targetitem = tree.treeBoxObject.view.getItemAtIndex(targetitem_idx);
			var parent = targetitem.parentNode;
			
			if (event.dataTransfer.dropEffect == "move")
			{
				if (currentitem_idx > targetitem_idx) parent.insertBefore(currentitem, targetitem);
				if (currentitem_idx < targetitem_idx) parent.insertBefore(currentitem, targetitem.nextSibling);
				tree.view.selection.select(targetitem_idx); // reselect the moved filter
			}
			if (event.dataTransfer.dropEffect == "copy")
			{
				parent.appendChild(currentitem.cloneNode(true))
				var last_idx = parent.childNodes.length-1; // select the last index (newly created item)
				currentitem = tree.treeBoxObject.view.getItemAtIndex(last_idx);
				
				parent.insertBefore(currentitem, targetitem);
				tree.view.selection.select(targetitem_idx); // reselect the duplicated filter
				
				tree.view.getItemAtIndex(targetitem_idx+1).firstChild.setAttribute('properties', "FilterDragCopy_remove");
			}
			
			// Now check is the user has InstantApply option to save the filter's order.
			var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
			if (instantApply)
			{
				//save the filters
				this.asf_savefilters();
			}
		} 
		event.preventDefault();
	},


	asf_duplicate: function () {
		var treename = "asf-filterList";
		
		var tree = document.getElementById(treename);
		var idx = tree.currentIndex;
		if (idx == -1) return false;
		var originidx = idx;
		var currentitem = tree.treeBoxObject.view.getItemAtIndex(idx);	
		var parent = currentitem.parentNode;
		{
			parent.appendChild(currentitem.cloneNode(true))
		}
		//select the new filter	
		idx = parent.childNodes.length-1; 
		tree.view.selection.select(idx);
		for (var i = idx ; i > originidx ; i--) // move the new copy 1 line above the original item
		{										// so the filter auto-saving process for instantApply (present in the move() function) works
			this.move("up");					// even if the user duplicate the bottom filter, it will move from 1 step
		}
		return false;
	},


	asf_delete: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		var filter = document.getElementById('asf-filterList');
		var rules = document.getElementById('asf-filterChilds');
		if (filter.view.selection.count > 0) 
		{
			for (var i=rules.childNodes.length-1 ; i>=0 ; i--) 
			{
				if (filter.view.selection.isSelected(i))
				rules.removeChild(rules.childNodes[i]);
			}
		}
		
		if (instantApply)
		{
			//save the filters
			this.asf_savefilters();
		}
		
		//detect remaining filters, unhighlight, and change right buttons states
		this.asf_treeSelected();
	},


	// next 2 functions : Code inspired from DTA (browsedir & createValidDestination)
	browsedir: function (targetID) {
		var inputbox = document.getElementById(targetID);
		var current_folder_input = inputbox.value;
		
		const nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		
		var filepickerdescription = "";
		if (targetID == "asf-default-folder") filepickerdescription = this.stringbundle.GetStringFromName("select_default_folder");
		if (targetID == "asf-exportFolder") filepickerdescription = this.stringbundle.GetStringFromName("export.default_folder");
		
		fp.init(window, filepickerdescription, nsIFilePicker.modeGetFolder);
		//fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
		
		// locate current directory
		current_folder_input = this.createValidDestination(current_folder_input);
		if (current_folder_input !== false) fp.displayDirectory = current_folder_input;
		
		var rv = fp.show();
		if (rv == nsIFilePicker.returnOK)
		{
			var asf_url = fp.file.path;
			// Set the data into the input box
			document.getElementById(targetID).value = asf_url;
		}
		
		//needed to save unicode paths using instantApply
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		if (instantApply)
		{
			//save the new folder right after editing
			var new_folder = document.getElementById(targetID).value;
			if (targetID == "asf-default-folder") this.saveUnicodeString("extensions.asf.defaultfolder", new_folder);
			if (targetID == "asf-exportFolder") this.saveUnicodeString("extensions.asf.exportFolder", new_folder);
		}
	},


	createValidDestination: function (path) {
		if (!path) return false;
		if (this.trim(path).length==0) return false;
		var directory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		
		try {
			directory.initWithPath(path);
			if (directory.exists()) 
				return directory;
			} catch(e) {return false;}
		return false;
	},


	// removed unicodepath, unicodestring is working fine.
/*
	loadUnicodeFolder: function (pref_place) {
		return this.prefManager.getComplexValue(pref_place, Components.interfaces.nsILocalFile).path;
	},
	
	saveUnicodeFolder: function (pref_place,path) {
		if (!path) return false;
		if (this.trim(path).length==0) return false;
		var directory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		directory.initWithPath(path);
		this.prefManager.setComplexValue(pref_place, Components.interfaces.nsILocalFile, directory);
	},
*/


	loadUnicodeString: function (pref_place) {
		return this.prefManager.getComplexValue(pref_place, Components.interfaces.nsISupportsString).data;
	},


	saveUnicodeString: function (pref_place,pref_data) {
		if (this.trim(pref_data).length==0) return false;
		var str = Components.classes["@mozilla.org/supports-string;1"]
					.createInstance(Components.interfaces.nsISupportsString);
		str.data = this.trim(pref_data);
		this.prefManager.setComplexValue(pref_place, Components.interfaces.nsISupportsString, str);
		return false ;
	},


	trim: function (string) {
		return string.replace(/(^\s*)|(\s*$)/g,'');
	},


	checkFirefoxVersion: function() {
		
		if (this.versionChecker.compare(this.appInfo.version, "7.0.1") >= 0)
		{
			this.firefoxversion = "7.01";
		}
		else if (this.versionChecker.compare(this.appInfo.version, "4.0b1") >= 0)
		{
			this.firefoxversion = "4";
		}
		else if(this.versionChecker.compare(this.appInfo.version, "3.0") >= 0) 
		{
			this.firefoxversion = "3";
		}
		else 
		{
			this.firefoxversion = "2";
		}
	},


	checkBetaVersion: function(showalert) {
		var current_version = document.getElementById('asf-version').value;
		var latest_version = "";
		var XhrObj = new XMLHttpRequest();
		XhrObj.onreadystatechange = function()
		{
			if (XhrObj.readyState == 4 && XhrObj.status == 200)
			{
				latest_version = XhrObj.responseText.split("\n") ;
				if(automatic_save_folder.versionChecker.compare(latest_version, current_version) > 0)
				{
					document.getElementById('asf-checkBetaUpdate').hidden = true;
					document.getElementById('asf-betaVersionAvailable').hidden = false;
					document.getElementById('asf-version').value = latest_version[0];
					document.getElementById('asf-version').hidden = false;
					document.getElementById('asf-betaUpdate-URL').value = latest_version[1];
					
					if (automatic_save_folder.firefoxversion == 4)
					{
						document.getElementById('asf-betaVersionUpdateNow').hidden = false;
					}
					if(showalert)
					{
						var message = automatic_save_folder.stringbundle.formatStringFromName("checkForUpdates.updateAvailable", latest_version, 1);
						alert(message);
					}
				}
				else
				{
					document.getElementById('asf-checkBetaUpdate').hidden = true;
					document.getElementById('asf-betaVersionNotAvailable').hidden = false;
				}
			}
		}
		
		XhrObj.open("POST", "http://asf.mangaheart.org/latestBetaVersion.php");
		XhrObj.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
		XhrObj.send("version="+current_version+"&link=true");
	},


	updateASF: function(location) {
		
		var location = document.getElementById("asf-betaUpdate-URL").value;
		//location = "http://asf.mangaheart.org/xpi/beta/automatic_save_folder-1.0.2bRev0086.xpi";
		if (this.firefoxversion == 4) // update to new version
		{
			Components.utils.import("resource://gre/modules/AddonManager.jsm");  
			
			AddonManager.getInstallForURL(location, function(aInstall) {  
			
			// aInstall is an instance of {{AMInterface("AddonInstall")}}  
			aInstall.install(); 
			alert("install finish, you need to reboot now");
			document.getElementById('asf-betaVersionUpdateNow').hidden = true;
			}, "application/x-xpinstall");  
		}
		
	},


	preferences_import: function(importType) {
	/** 
	// importType (String) : "all", "filters", "preferences"
	*/
		
		// read the default import/export folder
		var exportFolder = document.getElementById("asf-exportFolder").value;
		
		var data = this.read_file(exportFolder);
		if (!data) return false;
		
		if(data[0]!="Automatic Save Folder") 
		{
			alert("not an ASF pref data");
			return false;
		}
		
		var compare = this.versionChecker.compare;
		var import_version = data[1];
		var asf_version = this.prefManager.getCharPref("extensions.asf.version");
		var apply = true;
		var message = "";
		
		if (compare(import_version, asf_version) == 1) // imported data is from a newer ASF version than the current ASF installed version
		{
			apply = false;
			message = this.stringbundle.GetStringFromName("export.importnewer");
		}
		
		
		if (compare(import_version, asf_version) == -1) // imported data is from an older ASF version than the current ASF installed version, let's check if data update is needed
		{
			
			apply = true;
			
			// upgrade exemple
			// 1.0.2bRev86
			if (this.versionChecker.compare(import_version, "1.0.2bRev86") == -1) // convert usecurrenturl=true to checkDomainOrder=1,5
			{
				for (var i = 2; i < data.length ; i++)
				{
					if (data[i].indexOf("extensions.asf.usecurrenturl") >= 0)
					{
						if (data[i] == "extensions.asf.usecurrenturl;bool=true")
						{
							
							data[i] = "extensions.asf.domainTestOrder;char=1,5";
						}
						else
						{
							data[i] = "extensions.asf.domainTestOrder;char=1";
						}
						break;
					}
				}
			}
			
			
			// 1.0.2bRev90 - removes the slashes to regexp and create new settings to store regexp state.
			if (this.versionChecker.compare(import_version, "1.0.2bRev90") == -1)
			{
				var prefDataReg = false;
				var dataLength = data.length;
				for (var i=2; i<dataLength; i++)
				{
					if (data[i].indexOf("extensions.asf.filters") >= 0)
					{
						type_pos = data[i].indexOf(";");
						data_pos = data[i].indexOf("=");
						if (type_pos > 0)
						{
							prefName = data[i].substring(0,type_pos);
							prefType = data[i].substring(type_pos+1,data_pos);
							prefData = data[i].substring(data_pos+1,data[i].length);
							
							if ( prefName.indexOf("domain") >0 || prefName.indexOf("filename") >0 )
							{
								prefDataReg = this.is_regexp(prefData);
								if (prefDataReg) // convert the current data
								{
									prefData = prefData.substring(1, prefData.length -1);
									if (prefData == ".*") 
									{
										prefData = "*";
										prefDataReg = false;
									}
								}
								data[i] = prefName+";char="+prefData; // replace the new data
								prefDataReg = prefDataReg == true ? "true" : "false" ;
								data.push(prefName+"_regexp"+";bool="+prefDataReg); // create the regexp value
							}
						}
					}
				}
			}
			
			
			// 1.0.5bRev116
			if (this.versionChecker.compare(import_version, "1.0.5bRev116") == -1) // copy useDownloadDir to extensions.asf.useDownloadDir
			{
				for (var i = 2; i < data.length ; i++)
				{
					if (data[i].indexOf("browser.download.useDownloadDir") >= 0)
					{
						if (data[i] == "browser.download.useDownloadDir;bool=true")
						{
							data[i] = "extensions.asf.useDownloadDir;bool=true";
						}
						else
						{
							data[i] = "extensions.asf.useDownloadDir;bool=false";
						}
						break;
					}
				}
			}
		}
		
		
		if (document.getElementById('asf-options-export-forceimport').checked == true)
		{
			apply = true;
		}
		
		if (apply == false)
		{
			alert(message);
			return false;
		}
		
		
		// import the data
		var type_pos, data_pos, prefName, prefType, prefData, dataType ;
		var notempdata = document.getElementById('asf-options-export-notempdata').checked;
		var importThisData = true;
		for (var i=1; i<data.length; i++)
		{
			// exclude these temporary data from import if option is checked
			importThisData = true;
			if (data[i].indexOf("extensions.asf.lastpath") >= 0 && notempdata == true) importThisData = false;
			if (data[i].indexOf("extensions.asf.tempdomain") >= 0 && notempdata == true) importThisData = false; 
			
			type_pos = data[i].indexOf(";");
			data_pos = data[i].indexOf("=");
			if ((type_pos > 0) && importThisData == true)
			{
				prefName  = data[i].substring(0,type_pos);
				prefType = data[i].substring(type_pos+1,data_pos);
				prefData = data[i].substring(data_pos+1,data[i].length);
				dataType = prefName.indexOf("extensions.asf.filters")>=0 ? "filters" : "preferences";
				if (importType == "all" || importType == dataType)
				{
					switch(prefType)
					{
						case "int" : this.prefManager.setIntPref(prefName, prefData); break;
						case "char" : this.saveUnicodeString(prefName, prefData); break;
						case "bool" : 
						{
							prefData = (prefData == "true" ? true : false) ;
							this.prefManager.setBoolPref(prefName, prefData); 
							break;
						}
					}
				}
			}
		}
		
		
		// we need to set back the radios, checkboxes and lists manually (Even with instantApply), because of dependencies.
		if (importType == "preferences" || importType == "all")
		{
			// filters tab
			document.getElementById("radio-savetype").value = this.prefManager.getIntPref("extensions.asf.savetype");						// use last folder if no filter found
			document.getElementById("asf-default-folder").value = this.loadUnicodeString("extensions.asf.defaultfolder");					// use default saving folder
			document.getElementById("asf-keeptemp-check").checked = this.prefManager.getBoolPref("extensions.asf.keeptemp");				// but last folder if same domain
			
			// options tab
			document.getElementById("asf-useDownloadDir").value = this.prefManager.getBoolPref("extensions.asf.useDownloadDir"); 			// useDownloadDir
			document.getElementById("asf-folderList").value = this.prefManager.getIntPref("browser.download.folderList");					// folderList 0= desk, 1= download, 2= user (firefox pref)
			document.getElementById("asf-useDownloadDirFiltered").checked = this.prefManager.getBoolPref("extensions.asf.useDownloadDirFiltered"); // only if a filter is found
			
			document.getElementById("asf-dialogaccept").checked = this.prefManager.getBoolPref("extensions.asf.dialogaccept");				// auto accept the save dialog
			document.getElementById("asf-dialogacceptFiltered").checked = this.prefManager.getBoolPref("extensions.asf.dialogacceptFiltered"); // only if a filter is found
			document.getElementById("asf-dialogForceRadioTo").value = this.prefManager.getCharPref("extensions.asf.dialogForceRadioTo");	// force radio choice to
			
			document.getElementById("asf-viewdloption").checked = this.prefManager.getBoolPref("extensions.asf.viewdloption");				// show the ASF box when saving
			document.getElementById("asf-viewdloptionType").value = this.prefManager.getIntPref("extensions.asf.viewdloptionType"); 		// box state if disabled
			// document.getElementById("asf-suggestAllPossibleFolders").checked = this.prefManager.getBoolPref("extensions.asf.suggestAllPossibleFolders"); // suggest all possible folders
			document.getElementById("asf-viewpathselect").checked = this.prefManager.getBoolPref("extensions.asf.viewpathselect");			// show a dropdown menu with all the filter's folders
			
			document.getElementById("asf-userightclick").checked = this.prefManager.getBoolPref("extensions.asf.userightclick");			// Activate filtering on the right click menus
			document.getElementById("asf-rightclicktimeout").checked = this.prefManager.getBoolPref("extensions.asf.rightclicktimeout");	// remove http-header reading delay
			var timeout = document.getElementById("asf-rightclicktimeout").checked ? '0' : '1000';
			this.prefManager.setIntPref("browser.download.saveLinkAsFilenameTimeout", timeout );											// set time out accordingly to the new imported pref
			
			document.getElementById("asf-lastdir").checked = this.prefManager.getBoolPref("extensions.asf.lastdir");						// for FF < 3.x only
			document.getElementById("asf-domainTestOrder").value = this.prefManager.getCharPref("extensions.asf.domainTestOrder");			// Domain test order
			document.getElementById("asf-regexp_caseinsensitive").checked = this.prefManager.getBoolPref("extensions.asf.regexp_caseinsensitive");	// case sensitivity
			
			document.getElementById("asf-pathlist_defaultforceontop").checked = this.prefManager.getBoolPref("extensions.asf.pathlist_defaultforceontop");	// default folder on top of the lists
			document.getElementById("asf-pathlist_alphasort").checked = this.prefManager.getBoolPref("extensions.asf.pathlist_alphasort");	// sort lists alphabetically
			document.getElementById("asf-rowmatchinghighlight").value = this.prefManager.getCharPref("extensions.asf.rowmatchinghighlight"); // highlight color when matching row is selected
			
			document.getElementById("asf-autoCheckBetaUpdate").checked = this.prefManager.getBoolPref("extensions.asf.autoCheckBetaUpdate"); // autocheck beta update
			
			document.getElementById("asf-dta_ASFtoDTA_isActive").checked = this.prefManager.getBoolPref("extensions.asf.dta_ASFtoDTA_isActive"); // send to dTa
			document.getElementById("asf-dta_sendMethod").value = this.prefManager.getCharPref("extensions.asf.dta_sendMethod");			// replace or add to dTa
			
			document.getElementById("asf-exportFolder").value = this.loadUnicodeString("extensions.asf.exportFolder");						// export button present on Filter's tab
			document.getElementById("asf-showExportButton").checked = this.prefManager.getBoolPref("extensions.asf.showExportButton");		// export button present on Filter's tab
			
			// Dynamic Folders tab
			document.getElementById("asf-variablemode").checked = this.prefManager.getBoolPref("extensions.asf.variablemode");
			
			this.asf_loadpref();  // reload the preferences
			this.asf_toggleradio(); // set the radio choice to the right place
			this.toggle_options(); // set the checkboxes disabled state
			this.asf_variablemode(); 
		}
		
		if (importType == "filters" || importType == "all")
		{
			var optionTabSelected = document.getElementById("asf-optionstab").selected;
			if (optionTabSelected) this.asf_selecttab("asf-tab-filters"); // go to filter tab to restore filters correctly
			this.asf_loadFilters(); // reload all the preferences from the prefManger
			this.asf_treeSelected();
			if (optionTabSelected) this.asf_selecttab("asf-tab-options"); // go back to previous tab
		}
		
		
		message =  this.stringbundle.GetStringFromName("export.importsuccessful");
		alert(message);
		
		return true;
	},


	preferences_export: function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].
								getService(Components.interfaces.nsIPrefService);
		
		
		// save the current data to userpref.js before exporting
		var optionTabSelected = document.getElementById("asf-optionstab").selected;
		if (optionTabSelected) this.asf_selecttab("asf-tab-filters"); // go to filter tab to restore filters correctly
		this.asf_savefilters(); //save the filters
		this.asf_saveoptions(); //save the options
		if (optionTabSelected) this.asf_selecttab("asf-tab-options"); // go back to previous tab
		
		
		// read the default import/export folder
		var exportFolder = document.getElementById("asf-exportFolder").value;
		
		var data = new Array;
		data[data.length] = "Automatic Save Folder"; // always first
		data[data.length] = this.prefManager.getCharPref("extensions.asf.version"); // always second
		
		var ASF_prefs = new Array;
		var additionnal_prefs = new Array;
		// ASF 1.0.0
		//ASF_prefs[ASF_prefs.length] = "browser.download.useDownloadDir";	// Removed since 1.0.5bRev116, now using ASF's own useDownloadDir setting.
		ASF_prefs[ASF_prefs.length] = "browser.download.folderList";
		
		
		ASF_prefs[ASF_prefs.length] = "extensions.asf.autoCheckBetaUpdate";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.checkBetaVersion";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.defaultfolder";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.dialogForceRadio";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.dialogForceRadioTo";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.dialogaccept";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.dialogacceptFiltered";
		// ASF_prefs[ASF_prefs.length] = "extensions.asf.usecurrenturl";  ---> removed since 1.0.2bRev86, replace with extensions.asf.domainTestOrder
		ASF_prefs[ASF_prefs.length] = "extensions.asf.dta_ASFtoDTA_isActive";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.dta_sendMethod";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.keeptemp";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.lastdir";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.lastpath";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.pathlist_alphasort";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.pathlist_defaultforceontop";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.regexp_caseinsensitive";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.rightclicktimeout";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.rowmatchinghighlight";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.savetype";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.tempdomain";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.useDownloadDirFiltered";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.userightclick";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.variablemode";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.viewdloption";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.viewdloptionType";
		ASF_prefs[ASF_prefs.length] = "extensions.asf.viewpathselect";
		
		
		// ASF version 1.0.2bRev86
		// can also use concat to fuse arrays.
		additionnal_prefs = ["extensions.asf.domainTestOrder"];
		ASF_prefs = ASF_prefs.concat(additionnal_prefs);
		
		// ASF version 1.0.2bRev89
		// add import/export feature
		additionnal_prefs = ["extensions.asf.showExportButton", "extensions.asf.exportFolder"];
		ASF_prefs = ASF_prefs.concat(additionnal_prefs);
		
		// ASF version 1.0.2bRev94
		// add suggestAllPossibleFolders option
		additionnal_prefs = ["extensions.asf.suggestAllPossibleFolders"];
		ASF_prefs = ASF_prefs.concat(additionnal_prefs);
		
		// ASF version 1.0.5bRev116
		// add useDownloadDir to ASF preferences instead of using Firefox's preferences.
		additionnal_prefs = ["extensions.asf.useDownloadDir", "extensions.asf.useDownloadDirFiltered"];
		ASF_prefs = ASF_prefs.concat(additionnal_prefs);
		
		// just before the filters, put number of filters
		ASF_prefs[ASF_prefs.length] = "extensions.asf.filtersNumber"; // number of shown Filters in the filter list (not the same as total filters stored in prefManager)
		
		//save the current formated preferences to data[]
		var line = data.length;
		for(var i=0; i<ASF_prefs.length; i++)
		{
			branch = ASF_prefs[i];
			type = prefs.getPrefType(branch);
			
			if (type)
			{
				switch (type)
				{
					case 32 : type = "char"; value = this.prefManager.getComplexValue(branch, Components.interfaces.nsISupportsString).data; break;
					case 64 : type = "int"; value = this.prefManager.getIntPref(branch); break;
					case 128 : type = "bool"; value = this.prefManager.getBoolPref(branch); break;
				}
				data[line++] = branch+";"+type+"="+value;
			}
		}
		
		
		// now save the filters
		var filter_number = 0;
		var filter_childs = 0;
		var type = 0;
		var value = "";
		var branch = "";
		while (1)
		{
			branch = "extensions.asf.filters"+filter_number+".";
			filter_childs = prefs.getBranch(branch).getChildList("", {});
			if(filter_childs.length)
			{
				for(var i=0; i<filter_childs.length; i++)
				{
					branch = "extensions.asf.filters"+filter_number+"."+filter_childs[i];
					type = prefs.getPrefType(branch);
					
					if (type)
					{
						switch (type)
						{
							case 32 : type = "char"; value = this.prefManager.getComplexValue(branch, Components.interfaces.nsISupportsString).data; break;
							case 64 : type = "int"; value = this.prefManager.getIntPref(branch); break;
							case 128 : type = "bool"; value = this.prefManager.getBoolPref(branch); break;
						}
						data[line++] = branch+";"+type+"="+value;
					}
				}
				filter_number++;
			}
			else
			{
				break;
			}
		}
		this.write_file(data, exportFolder);
	},


	recover_filters: function() {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].
								getService(Components.interfaces.nsIPrefService);
		
		// check number of filters
		var filter_number = 0;
		var filter_childs = 0;
		var branch = "";
		while (1)
		{
			branch = "extensions.asf.filters"+filter_number+".";
			filter_childs = prefs.getBranch(branch).getChildList("", {});
			if(filter_childs.length)
			{
				filter_number++;
			}
			else
			{
				break;
			}
		}
		
		var before = this.prefManager.getIntPref("extensions.asf.filtersNumber");
		var recovered = new Array;
		recovered[0] = filter_number - before;
		this.prefManager.setIntPref("extensions.asf.filtersNumber",filter_number);
		
		var optionTabSelected = document.getElementById("asf-optionstab").selected;
		if (optionTabSelected) this.asf_selecttab("asf-tab-filters"); // go to filter tab to restore filters correctly
		this.asf_loadFilters(); // reload all the pref from the prefManger
		this.asf_treeSelected();
		if (optionTabSelected) this.asf_selecttab("asf-tab-options"); // go back to previous tab
		
		// print xxxx filters recovered
		var message = this.stringbundle.formatStringFromName("export.recoveredfilters", recovered, 1);
		alert (message);
	},


	delete_filters: function(all) {
	/** 
	// all (Bool) : true = delete all filters ; false = delete only unused filters from database.
	*/
		var prefs = Components.classes["@mozilla.org/preferences-service;1"].
								getService(Components.interfaces.nsIPrefService);
		
		
		// now save the filters
		if(all) this.prefManager.setIntPref("extensions.asf.filtersNumber", 0);
		var filter_number = this.prefManager.getIntPref("extensions.asf.filtersNumber");
		var filter_childs = 0;
		var branch = "";
		while (1)
		{
			branch = "extensions.asf.filters"+filter_number+".";
			filter_childs = prefs.getBranch(branch).getChildList("", {});
			if(filter_childs.length)
			{
				prefs.deleteBranch(branch);
				filter_number++;
			}
			else
			{
				break;
			}
		}
		
		var optionTabSelected = document.getElementById("asf-optionstab").selected;
		if (optionTabSelected) this.asf_selecttab("asf-tab-filters"); // go to filter tab to restore filters correctly
		this.asf_loadFilters(); // reload all the pref from the prefManger
		this.asf_treeSelected();
		if (optionTabSelected) this.asf_selecttab("asf-tab-options"); // go back to previous tab
	},


	reset_preferences: function() {
		
		// reload default value to preferences 
		this.prefManager.setBoolPref("extensions.asf.lastdir", true);
		this.prefManager.setBoolPref("extensions.asf.keeptemp", true);
		this.prefManager.setBoolPref("extensions.asf.viewdloption", false);
		this.prefManager.setIntPref("extensions.asf.viewdloptionType", 0);
		this.prefManager.setBoolPref("extensions.asf.viewpathselect", false);
		this.prefManager.setIntPref("extensions.asf.savetype", 0);
		this.prefManager.setCharPref("extensions.asf.defaultfolder", "");
		this.prefManager.setCharPref("extensions.asf.tempdomain", "");
		// this.prefManager.setIntPref("extensions.asf.filtersNumber", 0); do not reset the number of active filters
		this.prefManager.setCharPref("extensions.asf.lastpath", "");
		this.prefManager.setBoolPref("extensions.asf.variablemode", false); 
		// See http://developer.mozilla.org/En/Download_Manager_preferences   or    http://kb.mozillazine.org/About:config_entries
		// it makes automatic saving to the right folder - 0= desktop, 1= system download dir, 2= user define
		// does only affect the user if useDownloadDir = true  ---- if "always ask the destination folder" is selected in FF options, it has no effect on the user.
		this.prefManager.setIntPref("browser.download.folderList", 2);
		this.prefManager.setBoolPref("extensions.asf.dialogaccept", false);
		this.prefManager.setBoolPref("extensions.asf.dialogacceptFiltered", false);
		this.prefManager.setBoolPref("extensions.asf.dialogForceRadio", false);
		this.prefManager.setCharPref("extensions.asf.dialogForceRadioTo", "save");
		this.prefManager.setBoolPref("extensions.asf.userightclick", true);
		this.prefManager.setBoolPref("extensions.asf.rightclicktimeout", true);
		if ( !this.DownloadSort_isEnabled() && this.firefoxversion >= 3) // only for firefox 3+, Firefox2 doesn't use timeout option
		{
			this.prefManager.setIntPref("browser.download.saveLinkAsFilenameTimeout", 0);
		}
		this.prefManager.setCharPref("extensions.asf.domainTestOrder", "1");
		this.prefManager.setBoolPref("extensions.asf.regexp_caseinsensitive", true);
		this.prefManager.setBoolPref("extensions.asf.pathlist_defaultforceontop", false);
		this.prefManager.setBoolPref("extensions.asf.pathlist_alphasort", true);
		this.prefManager.setCharPref("extensions.asf.rowmatchinghighlight", "color");
		this.prefManager.setBoolPref("extensions.asf.dta_ASFtoDTA_isActive", false);
		this.prefManager.setCharPref("extensions.asf.dta_sendMethod", "replace");
		this.prefManager.setBoolPref("extensions.asf.autoCheckBetaUpdate", false);
		this.prefManager.setCharPref("extensions.asf.exportFolder", "");
		this.prefManager.setBoolPref("extensions.asf.showExportButton", false);
		
		this.asf_loadpref();  // reload the preferences
		this.asf_toggleradio(); // set the radio choice to the right place
		this.toggle_options(); // set the checkboxes disabled state
		this.asf_variablemode();
	},


	read_file: function(folder) {
	// thanks to TabMixPlus
	/**
	// folder (String) : Default opened folder (optional)
	// Input (Stream) : File in UTF8 without BOM.
	// Return (Array) : Array, in unicode (each cell = 1 line from file)
	*/
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
		var stream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
		var streamIO = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
		var convutf8 = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			convutf8.charset = "UTF-8";
		
		fp.init(window, null, fp.modeOpen);
		fp.defaultExtension = "txt";
		fp.appendFilters(fp.filterText | fp.filterAll);
		
		
		// select the opened folder
		if (folder != "undefined")
		{
			var current_folder_input = this.createValidDestination(folder);
			if (current_folder_input !== false) fp.displayDirectory = current_folder_input;
		}
		
		if (fp.show() != fp.returnCancel) 
		{
			stream.init(fp.file, 0x01, 0444, null);
			streamIO.init(stream);
			var input = streamIO.read(stream.available());
			streamIO.close();
			stream.close();
			
			input = convutf8.ConvertToUnicode(input);
			
			var linebreak = input.match(/(((\n+)|(\r+))+)/m)[1]; // first: whole match -- second: backref-1 -- etc..
			return input.split(linebreak);
		}
		return null;
	},


	write_file: function(data, folder) {
	// thanks to TabMixPlus
	/**
	// data (Array) : array in Unicode to convert to file line by line
	// folder (String) : opening folder (optional)
	// Output (Stream) : file in UTF8 without BOM.
	*/
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
		var stream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
		var convutf8 = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		convutf8.charset = "UTF-8";
		
		
		var objdate = new Date();
		var year = objdate.getFullYear();
		var month = ((objdate.getMonth()+1) <10) ? ("0" + (objdate.getMonth()+1)) : objdate.getMonth()+1;
		var day = ((objdate.getDate()) <10) ? ("0" + (objdate.getDate())) : objdate.getDate();
		fp.init(window, null, fp.modeSave);
		fp.defaultExtension = "txt";
		fp.defaultString = "ASFpref_"+year+"-"+month+"-"+day+".txt";
		fp.appendFilters(fp.filterText | fp.filterAll);
		
		
		// select the opened folder
		if (folder != "undefined")
		{
			var current_folder_input = this.createValidDestination(folder);
			if (current_folder_input !== false) fp.displayDirectory = current_folder_input;
		}
		
		if (fp.show() != fp.returnCancel)
		{
			if (fp.file.exists()) fp.file.remove(true);
			fp.file.create(fp.file.NORMAL_FILE_TYPE, 0666);
			stream.init(fp.file, 0x02, 0x200, null);
			
			for (var i = 0; i < data.length ; i++) 
			{
				try
				{
					data[i] = convutf8.ConvertFromUnicode(data[i]);
					
					data[i]=data[i]+"\r\n";
					stream.write(data[i], data[i].length);
				}
				catch(e)
				{
					alert (e)
				}
			}
			stream.close();
		}
	},


	// get TabGroup name, from https://hg.mozilla.org/mozilla-central/rev/b284e10652d3
	getActiveGroupName: function () {
		
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
						   .getService(Components.interfaces.nsIWindowMediator);
		var mainWindow = wm.getMostRecentWindow("navigator:browser");
		
		// We get the active group this way, instead of querying
		// GroupItems.getActiveGroupItem() because the tabSelect event
		// will not have happened by the time the browser tries to
		// update the title.
		let groupItem = null;
		let activeTab = mainWindow.gBrowser.selectedTab;
		let activeTabItem = activeTab._tabViewTabItem;
		
		if (activeTab.pinned)
		{
			// It's an app tab, so it won't have a .tabItem.
			groupItem = null; // I didn't find how to get the Active Group's Name.
		}
		else if (activeTabItem)
		{
			groupItem = activeTabItem.parent;
		}
		
		// groupItem may still be null, if the active tab is an orphan.
		return groupItem ? groupItem.getTitle() : "";
	},


	DownloadSort_isEnabled: function() {
		// Check for Download sort add-on, if enabled return true. 
		
			
		// Starting from Firefox 4.x, a new addon manager must be use, but it doesn't work :
			/*
			var DownloadSort = false;
			Components.utils.import("resource://gre/modules/AddonManager.jsm");
			AddonManager.getAddonByID("asf@mangaheart.org", function(addon) {
			DownloadSort = addon.isActive;
			});
			//1st access to DownloadSort doesnt work - time to short ; New asynchronous addon manager is a problem :(
			alert("1st try to get the version: " + DownloadSort);
			alert("2nd try to get the version: " + DownloadSort);
			return DownloadSort;
			*/
			
		// So let's use the same method than Firefox 3
		// Firefox need to be restarted for addon state to takes effect.
		if (this.firefoxversion >= 4)
		{
			var enabledItems = this.prefManager.getCharPref("extensions.enabledAddons");
		}
		if (this.firefoxversion == 3)
		{
			var enabledItems = this.prefManager.getCharPref("extensions.enabledItems");
		}

		var addon_GUUID = "D9808C4D-1CF5-4f67-8DB2-12CF78BBA23F";
		var DownloadSort = enabledItems.indexOf(addon_GUUID,0);
			
		if (DownloadSort >= 0) return true;

		return false;
	},


	DownThemAll_isEnabled: function() {
		// Check for DTA add-on, if enabled return true. 
		
		if (this.firefoxversion >= 4)
		{
			var enabledItems = this.prefManager.getCharPref("extensions.enabledAddons");
		}
		if (this.firefoxversion == 3)
		{
			var enabledItems = this.prefManager.getCharPref("extensions.enabledItems");
		}

		var addon_GUUID = "DDC359D1-844A-42a7-9AA1-88A850A938A8";
		var DTA = enabledItems.indexOf(addon_GUUID,0);
		if (DTA >= 0) return true;
		
		//Same but for beta, nighly release of dTa
		addon_GUUID = "dta@downthemall.net";
		DTA = enabledItems.indexOf(addon_GUUID,0);
		if (DTA >= 0) return true;
		addon_GUUID = "dta%40downthemall.net";
		DTA = enabledItems.indexOf(addon_GUUID,0);
		if (DTA >= 0) return true;
		
		return false;
	},


	readHiddenPref: function(pref_place, type, ret) {
		if(this.prefManager.getPrefType(pref_place))
		{
			switch (type)
			{
				case "bool": return this.prefManager.getBoolPref(pref_place);
				case "int" : return this.prefManager.getIntPref(pref_place);
				case "char": return this.prefManager.getCharPref(pref_place);
				case "complex": return this.prefManager.getComplexValue(pref_place, Components.interfaces.nsISupportsString).data;
			}
		}
		else
		{
			return ret; // return default value if pref doesn't exist
		}
	},


	asf_savefilters: function () {
	//save the filters list	
		var tree = document.getElementById("asf-filterList");
		var listBox = document.getElementById("asf-filterList");
		
		this.asf_selecttab("asf-tab-filters");  // Go back to the Filters tabs in order to read and save the Tree data (it doesn't work it it's hidden)
		
		var nbrRow = listBox.view.rowCount;
		
		// set the number of filter in the tree
		this.prefManager.setIntPref("extensions.asf.filtersNumber", nbrRow);
		
		
		for (var i=0; i < nbrRow ; i++)
		{
			var domain = tree.view.getCellText(i,tree.columns.getColumnAt("0"));
			var filename = tree.view.getCellText(i,tree.columns.getColumnAt("1"));
			var folder = tree.view.getCellText(i,tree.columns.getColumnAt("2"));
			var active = tree.view.getCellValue(i,tree.columns.getColumnAt("3"));
			var domain_regexp = tree.view.getCellValue(i,tree.columns.getColumnAt("4"));
			var filename_regexp = tree.view.getCellValue(i,tree.columns.getColumnAt("5"));
			active = (active == "true" ? true : false) ;
			domain_regexp = (domain_regexp == "true" ? true : false) ;
			filename_regexp = (filename_regexp == "true" ? true : false) ;
			
			this.saveUnicodeString("extensions.asf.filters"+ i +".domain", domain);
			this.saveUnicodeString("extensions.asf.filters"+ i +".filename", filename);
			this.saveUnicodeString("extensions.asf.filters"+ i +".folder", folder);
			this.prefManager.setBoolPref("extensions.asf.filters"+ i +".active", active);
			this.prefManager.setBoolPref("extensions.asf.filters"+ i +".domain_regexp", domain_regexp);
			this.prefManager.setBoolPref("extensions.asf.filters"+ i +".filename_regexp", filename_regexp);
		}
	},


	asf_saveoptions: function() {
		//Save the View_path_list options
		var view_list = document.getElementById("asf-viewpathselect").checked;
		this.prefManager.setBoolPref("extensions.asf.viewpathselect",view_list)
		
		
		//save the rightclick (set timeout for header(Content-Disposition:) true = 0, false = 1000)
		// Only if DownloadSort is not enabled (prevent conflict)
		if ( !this.DownloadSort_isEnabled() && this.firefoxversion >= 3) // only for firefox 3+, Firefox2 doesn't use timeout option
		{
			var asf_rightclicktimeout = document.getElementById("asf-rightclicktimeout").checked;
			this.prefManager.setIntPref("browser.download.saveLinkAsFilenameTimeout", asf_rightclicktimeout == true ? 0 : 1000);
		}
		
		//save the default folder (filters tab)
		var default_folder = document.getElementById("asf-default-folder").value;
		this.saveUnicodeString("extensions.asf.defaultfolder", default_folder);	
		
		//save the default import/export folder (options/data management tab)
		var exportFolder = document.getElementById("asf-exportFolder").value;
		this.saveUnicodeString("extensions.asf.exportFolder", exportFolder);	
		
		// bug from both instantApply and non instantApply, when changing checked state with javascript the state is not saved
		// so for all the sub-option, let's save manually :
		this.prefManager.setBoolPref("extensions.asf.viewpathselect", document.getElementById("asf-viewpathselect").checked);
		this.prefManager.setBoolPref("extensions.asf.rightclicktimeout", document.getElementById("asf-rightclicktimeout").checked);
		this.prefManager.setBoolPref("extensions.asf.dialogacceptFiltered", document.getElementById("asf-dialogacceptFiltered").checked);
		this.prefManager.setBoolPref("extensions.asf.dialogForceRadio", document.getElementById("asf-dialogForceRadio_Start").checked);
		this.prefManager.setBoolPref("extensions.asf.useSiteBySiteSavePath", document.getElementById("asf-useSiteBySiteSavePath").checked);
		this.prefManager.setBoolPref("extensions.asf.useDownloadDirFiltered", document.getElementById("asf-useDownloadDirFiltered").checked);
		
		
	},


	asf_savepref: function () {
	//save the filters
		this.asf_savefilters();
		
	//save the options
		this.asf_saveoptions();
		
	// close the preference window
		this.asf_close();
	},


	asf_close: function() {
		
		//close the options	
		if (window.opener.location == "chrome://mozapps/content/downloads/unknownContentType.xul") // if the option is opened from the saving window
		{
			window.opener.automatic_save_folder.main();		// rescan the filters to set the good folder
			window.opener.automatic_save_folder.check_uCTOption();
			window.opener.sizeToContent(); // can create a bug, but it should not be noticed by the user. see https://bugzilla.mozilla.org/show_bug.cgi?id=439323
		}
		window.close();
		window.opener.focus;
	}
	
	
};