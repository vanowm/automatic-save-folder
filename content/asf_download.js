/* ***** BEGIN LICENSE BLOCK *****
Automatic Save Folder
Copyright (C) 2007-2010 Éric Cassar (Cyan).
			  2009 Ted Gifford - Dynamic variable capturing

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
				
		firefoxversion : "",
		
	main: function () {


		// Setting private variables usable in this function
		var prefManager = automatic_save_folder.prefManager;
		var versionChecker = automatic_save_folder.versionChecker;
		var appInfo = automatic_save_folder.appInfo;
		if(this.versionChecker.compare(this.appInfo.version, "3.0") >= 0)
		{
			this.firefoxversion = "3";
		}
		else
		{
			this.firefoxversion = "2";
		}
		
		// Enable Private Browsing support with filepicker - Thanks to Ehsan Akhgari at http://ehsanakhgari.org/
		if (this.versionChecker.compare(this.appInfo.version, "3.5") >= 0)
		{
			Components.utils.import("resource://gre/modules/DownloadLastDir.jsm");
		}
		
		// Check if there is any filter in list
		var nbrfilters = 	prefManager.getIntPref("extensions.asf.filtersNumber");
		
		
		// load the domain and the filename of the saved file (copy the data from the firefox saving window)
		var domain = 		document.getElementById("source").value ;
		var filename = 		document.getElementById("location").value ;
		
		// debug : show the full downloaded link  http://abc.xyz/def/file.ext
		// Can use this new function to get free from the need of the download window.
		//var url = dialog.mLauncher.source.spec;
		//alert(url);
		
		
		
		
		// load prefmanager data
		var savetype = 				prefManager.getIntPref("extensions.asf.savetype");
		var lastdir = 				prefManager.getBoolPref("extensions.asf.lastdir");	     // for Firefox2 : set save as Ctrl+S too
		var defaultfolder = 		this.loadUnicodeString("extensions.asf.defaultfolder");
		var keeptemp = 				prefManager.getBoolPref("extensions.asf.keeptemp");
		var tempdomain = 			this.loadUnicodeString("extensions.asf.tempdomain");      // hosted domain from last saved file
		var variable_mode = 		prefManager.getBoolPref("extensions.asf.variablemode");  // enable Variables in folder creation (dynamic Folders)
		var dialogaccept = 			prefManager.getBoolPref("extensions.asf.dialogaccept");
		var dialogacceptFiltered = 	prefManager.getBoolPref("extensions.asf.dialogacceptFiltered");
		var use_currentURL = 		prefManager.getBoolPref("extensions.asf.usecurrenturl");
		
		// If variable/Dynamic folders mode is ON, let's replace the variables to create the new defaultfolder
		if (variable_mode == true)
		{
			defaultfolder = this.createfolder(defaultfolder);
		}
		
		// set the last saved path into asf.lastpath
		if (this.firefoxversion == "3")   // take the download.lastDir if it's FF3
		{
			var folder = this.loadUnicodeString("browser.download.lastDir");
		}
		else // else if it's not FF3 (it's 1.5 or 2), read Download.dir
		{
			var folder = this.loadUnicodeString("browser.download.dir");
		}
		this.saveUnicodeString("extensions.asf.lastpath", folder); // And set it to asf.lastpath to be compared later with the new path the filters will set to lastDir (or dir)
		
		
		// load filters data from prefmanager into filters[]
		// filters[filternumber][label]
		var filters = new Array();
		for ( var i = 0 ; i < nbrfilters ; i++)
		{
			var dom = this.loadUnicodeString("extensions.asf.filters"+ i +".domain");
			var fil = this.loadUnicodeString("extensions.asf.filters"+ i +".filename");
			var fol = this.loadUnicodeString("extensions.asf.filters"+ i +".folder");
			var act = prefManager.getBoolPref("extensions.asf.filters"+ i +".active");
			filters[i] = [dom, fil, fol, act];
		}
		
		
		//
		// Start checking the filters with the downloaded file
		//
		var idx = -1 ;
		var dom_regexp = false;
		var file_regexp = false;
		for ( var i = 0 ; i < filters.length ; i++)
		{
			if (filters[i][3] == true)  // if not temporary deactivated
			{
				dom_regexp = false ; // reset the matching string for the "for" loop
				file_regexp = false ; // same as above
			// Check the domain
				dom_regexp = this.test_regexp(filters[i][0], domain);  // hosted Domain
				
			// Check the current website URL if hosted domain checking returned false.
				if (!dom_regexp && use_currentURL)
				{
					var uCT = document.getElementById("unknownContentType");
					try
					{
						var currentURL = uCT.parentNode.defaultView.opener.location.host; // look for the current website URL in the DOM.
						dom_regexp = this.test_regexp(filters[i][0], currentURL); // check the filter domain with the current website URL only if the hosted domain doesn't match
					}
					catch (e) { } // if there is no location.host data (tab is closed or script redirection), use the default folder as there are no filter's domain or current URL domain.
				}
				
			// Check the filename
				file_regexp = this.test_regexp(filters[i][1], filename); // Filename
				
				// debug
				// alert ("i = "+i+"\n domain match = "+dom_regexp+"\n file match = "+file_regexp);
				if (dom_regexp && file_regexp)
				{
					var idx = i;
					break;
				}
			}
		} // end filters loop
		
		if (idx < 0) // if no filters matched
		{
			if(savetype == 1)  // and folder is set to user choice
			{
				if ( (keeptemp == false) || ((keeptemp == true) && ( tempdomain != domain )) ) // and, if [same domain not checked] OR [ if same domain (keeptemp) is checked and domain not same as previous one]
				{	// then change the destination folder to user choice
					this.set_savepath(defaultfolder);
				}
				else  // else, if domain is the same as the last, and the user checked "use the same folder if same domain"
				{
					if (this.firefoxversion == "3")
					{
						var lastpath = this.loadUnicodeString("browser.download.lastDir");
					}
					if (this.firefoxversion == "2")
					{
						var lastpath = this.loadUnicodeString("browser.download.dir");
					}
					
					if (lastpath == "") // if no path is returned (first time using lastDir, or the user reseted the content manually in about:config)
					{
						lastpath = defaultfolder;
					}
					this.set_savepath(lastpath);
				}
			}
			else // else, if savetype == 0  (folder is set to last folder)
			{
				if (this.firefoxversion == "3")
				{
					var lastpath = this.loadUnicodeString("browser.download.lastDir");
				}
				if (this.firefoxversion == "2")
				{
					var lastpath = this.loadUnicodeString("browser.download.dir");
				}
				
				if (lastpath == "") // if no path is returned (first time using lastDir, or the user reseted the content manually in about:config)
				{
					lastpath = defaultfolder;
				}
				this.set_savepath(lastpath);
			}
		}
		else // if a filter is found
		{
			var folder = filters[idx][2];
			
			// If Advanced mode is ON, let's check the variables and create the folder
			if (variable_mode == true)
			{
				folder = this.createfolder(folder, idx);
			}
			
			this.set_savepath(folder);
		}
		
		// in every case, set the new file hosted domain to tempdomain if not in private browsing
		var inPrivateBrowsing = false;
		if (this.firefoxversion == 3)
		{
			try {
				var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]
									.getService(Components.interfaces.nsIPrivateBrowsingService);
				inPrivateBrowsing = pbs.privateBrowsingEnabled;
			}
			catch (e) { // nsIPrivateBrowsingService not working on FF2 and 3.0
			}
		}
		if (!inPrivateBrowsing)
		{
			this.saveUnicodeString("extensions.asf.tempdomain", domain);
		}
		
		
		// Automatic saving when clicking on a link. The save dialog still flash onscreen very quickly.
		if (dialogacceptFiltered && idx < 0) dialogaccept = false; // no filter matched, do not autoaccept the dialog
		if (dialogaccept)
		{
			window.close();
			return dialog.onOK();
		}
		else
		{
			// show or hide the asf option on saving window
			this.show_dloptions();
			this.check_uCTOption(true);
		}
		
	return false;
	},
	
	
	set_savepath: function(path) {
		var folderList = this.prefManager.getIntPref("browser.download.folderList");
		var lastdir = this.prefManager.getBoolPref("extensions.asf.lastdir");	     // for Firefox2 : set save as Ctrl+S too
		var useDownloadDir = this.prefManager.getBoolPref("browser.download.useDownloadDir");
		var folderList = this.prefManager.getIntPref("browser.download.folderList");
		
		var directory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		directory.initWithPath(path);
		
		// Check if the user use the "do not show file explorer" to automatically save to "desktop" or "downloads" and force the suggested path to those folders instead of filtered path
		if (useDownloadDir == true)
		{
			var desk = Components.classes["@mozilla.org/file/directory_service;1"]
								.getService(Components.interfaces.nsIProperties)
								.get("Desk", Components.interfaces.nsILocalFile);
			
			if (this.firefoxversion == 3)
			{
				var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
									.getService(Components.interfaces.nsIDownloadManager);
				var supportDownloadLabel = !dnldMgr.defaultDownloadsDirectory.equals(desk);
				
				if ( (folderList == 0) || (folderList == 1 && !supportDownloadLabel) ) // if desktop or if OS doesn't support default Download dir
				{
					var directory = desk;
				}
				if (folderList == 1 && supportDownloadLabel) // default Downloads folder
				{
					directory.initWithPath(dnldMgr.defaultDownloadsDirectory.path);
				}
			}
		}
		
		
		if (this.firefoxversion == 2)
		{
		
			this.saveUnicodeString("browser.download.dir", directory.path);
			if (lastdir)
			this.saveUnicodeString("browser.download.lastDir", directory.path);
		}
		
		if (this.firefoxversion == 3)
		{
		
			var inPrivateBrowsing = false;
			try {
				var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]
									.getService(Components.interfaces.nsIPrivateBrowsingService);
				inPrivateBrowsing = pbs.privateBrowsingEnabled;
			}
			catch (e) { // nsIPrivateBrowsingService not working on FF2 and 3.0
			}
			
			if (inPrivateBrowsing && directory)
			{
				gDownloadLastDir.file = directory;
			}
			else
			{
				this.saveUnicodeString("browser.download.lastDir", directory.path);
				if (folderList == 2)
					this.saveUnicodeString("browser.download.dir", directory.path);
			}
			
		}
	},
	
	
	loadUnicodeString: function (pref_place) {
		try
		{
			return this.prefManager.getComplexValue(pref_place, Components.interfaces.nsISupportsString).data;
		}
		catch (e)
		{ }
		return "";
	},
	
	
	saveUnicodeString: function (pref_place,pref_data) {
		var str = Components.classes["@mozilla.org/supports-string;1"]
					.createInstance(Components.interfaces.nsISupportsString);
		str.data = pref_data;
		this.prefManager.setComplexValue(pref_place, Components.interfaces.nsISupportsString, str);
	},
	
	
	createfolder: function (path, idx) {
		
		if (!path) return false;
		if (this.trim(path).length==0) return false;
		
		Date.prototype.getWeek = function() // Add the getWeek() function do date()
		{
			var onejan = new Date(this.getFullYear(),0,1);
			var week = Math.ceil((((this - onejan) / 86400000) + onejan.getDay()-1)/7);
			if (onejan.getDay() > 4) week--;  // if the first week does not contain a thrusday, it's not the first week (and return as week 0)
			return week;
		}
		var objdate = new Date();
		
		// make the array with the month's name in the stringbundle of the locale language path.
		
		var stringbundle = Components.classes['@mozilla.org/intl/stringbundle;1'].
											getService(Components.interfaces.nsIStringBundleService).
                           createBundle('chrome://asf/locale/asf.properties');
		
		var fullmonthname = new Array();
		var abbrmonthname = new Array();
		var fulldayname = new Array();
		var abbrdayname = new Array();
		for (var i = 1 ; i<= 12 ; i++)
		{
			fullmonthname[i-1] = stringbundle.GetStringFromName("month"+i+"_full");
			abbrmonthname[i-1] = stringbundle.GetStringFromName("month"+i+"_abbr");
		}
		for (var i = 0 ; i<= 6 ; i++)
		{
			fulldayname[i] = stringbundle.GetStringFromName("day"+i+"_full");
			abbrdayname[i] = stringbundle.GetStringFromName("day"+i+"_abbr");
		}
		
		
		const ZERO = "0";  // leading zero
		
		// load the domain and the filename of the saved file
		var domain = 	document.getElementById("source").value ;
			domain =    domain.replace(/^.*:\/\//g,'');  // remove the protocol name from the domain
		var filename = 	document.getElementById("location").value ;
		var file_name = filename.replace (/\.(?!.*\.).*$/i, "");  // Trim from the last dot to the end of the file = remove extension
		var extension = filename.match(/([^\.]*)$/i);  // take out the extension (anything not containing a dot, with an ending line)
		
		
		
		// check the filter's data
		var asf_domain = "";
		var asf_filename = "";
		if (idx)  // If a filter match, idx is true
		{
			asf_domain = this.loadUnicodeString("extensions.asf.filters"+ idx +".domain");
			asf_filename = this.loadUnicodeString("extensions.asf.filters"+ idx +".filename");
		}
		else // no filter is found, use actual Domain and filename without extension
		{
			asf_domain = domain;
			asf_filename = file_name;
		}
		
		
		var dom_regexp = this.test_regexp(asf_domain, document.getElementById("source").value);
		var file_regexp = this.test_regexp(asf_filename, filename);
		
// Ted Gifford, start block
		// String capture in filename with $<1-9>f
		try {
		//alert(file_regexp.length);
			if (file_regexp.length > 1)
			{
				//alert('munging path: ' + path);
				for (var replace_index = 1; replace_index < file_regexp.length; ++replace_index)
						path = path.replace("$"+replace_index+"f", file_regexp[replace_index]);
				//alert('munged path: ' + path);
			}
		} catch (e) {alert(e);}
		// String capture in domain with $<1-9>d
		try {
		//alert(dom_regexp.length);
			if (dom_regexp.length > 1)
			{
				//alert('munging path: ' + path);
				for (var replace_index = 1; replace_index < dom_regexp.length; ++replace_index)
						path = path.replace("$"+replace_index+"d", dom_regexp[replace_index]);
				//alert('munged path: ' + path);
			}
		} catch (e) {alert(e);}
// Ted Gifford, end block
		
		// Trim the / / if domain is regexp
		if (this.is_regexp(asf_domain))
		{
			asf_domain = asf_domain.substring(1, asf_domain.length);
			asf_domain = asf_domain.substring(0, asf_domain.length -1);
		}
		// Trim the / / if filename is regexp
		if (this.is_regexp(asf_filename))
		{
			asf_filename = asf_filename.substring(1, asf_filename.length);
			asf_filename = asf_filename.substring(0, asf_filename.length -1);
		}
		
		// read the userpref to define if regexp is case insensitive (default true)
		var param = "";
		var regexp_caseinsensitive = this.readHiddenPref("extensions.asf.regexp_caseinsensitive", "bool", true); // let the user choose in next release.
		if (regexp_caseinsensitive) param = "i";
		
		// Check if asf_rd is present and process     asf_rd = Regexp the domain
		if (path.search("%asf_rd%") != -1)
		{
			// get the domain with the protocol
			var domainp = 	document.getElementById("source").value ;
			
			// extract the filter part
			var matches = path.match(/%asf_rd%.*?%asf_rd%/g);        // matches is an array
			if (matches != null)
			{
				var datareg = "";
				var result = new Array();
				var matchreplace = new Array();
				for (var i = 0, len = matches.length; i < len; i++)
				{
					datareg = matches[i].replace(/%asf_rd%/g, '');  // remove the %asf_rf% to keep only the regexp
					datareg = new RegExp(datareg, param);			//  create the regexp
					//alert("reg="+datareg);
					result = domainp.match(datareg);    // Check it on the domain with protocol
					
					if (result == null)
					{
						matchreplace[i] = ""; // if no result, replace with nothing instead of null
					}
					else
					{
						matchreplace[i] = result[0];
					}
					//alert("matchreplace["+i+"]="+matchreplace[i]);
				}
				for (var i = 0, len = matches.length; i < len; i++)
				{
					path = path.replace(matches[i], matchreplace[i]);  // replace each variable in the path
				}
			}
		}
		
		
		// Check if asf_rf is present and process     asf_rf = Regexp the filename
		if (path.search("%asf_rf%") != -1 )
		{
			// extract the filter part
			var matches = path.match(/%asf_rf%.*?%asf_rf%/g);        // matches is an array
			if (matches != null)
			{
				var datareg = "";
				var result = new Array();
				var matchreplace = new Array();
				for (var i = 0, len = matches.length; i < len; i++)
				{
					datareg = matches[i].replace(/%asf_rf%/g, '');  // remove the %asf_rf% to keep only the regexp
					datareg = new RegExp(datareg, param);			//  create the regexp
					//alert("reg="+datareg);
					result = filename.match(datareg);    // Check it
					
					if (result == null)
					{
						matchreplace[i] = ""; // if no result, replace with nothing instead of null
					}
					else
					{
						matchreplace[i] = result[0];
					}
					//alert("matchreplace["+i+"]="+matchreplace[i]);
				}
				for (var i = 0, len = matches.length; i < len; i++)
				{
					path = path.replace(matches[i], matchreplace[i]);  // replace each variable in the path
				}
			}
		}
		
		
		
		// remove special characters from filters :
		// forbidden on windows  \ / : * ? " < > |
		if (navigator.appVersion.indexOf("Win")!=-1) // = Windows
		{
			asf_domain = asf_domain.replace(/[\/\:\*\?\"\<\>\|]/g,'');
			asf_filename = asf_filename.replace(/[\/\:\*\?\"\<\>\|]/g,'');
			file_name = file_name.replace(/[\/\:\*\?\"\<\>\|]/g,'');
			path = path.replace(/[\/\*\?\"\<\>\|]/g,'');
		}
		else  // MacOS and linux, replace only  / :
		{
			asf_domain = asf_domain.replace(/[\/\:]/g,'');
			asf_filename = asf_filename.replace(/[\/\:]/g,'');
			file_name = file_name.replace(/[\/\:]/g,'');
		}
		
		// replace the string here		// Year
			path = path					.replace(/%Y%/g, objdate.getFullYear())  // full year format = 2009
										.replace(/%y%/g, ((objdate.getYear()-100) <10) ? (ZERO + (objdate.getYear()-100)) : objdate.getYear()-100)  // year in YY format : 08, 09, 10
									//	.replace(/%<to define>/g, objdate.getYear()-100)  // 8, 9, 10, (no leading 0)
										// Month
										.replace(/%m%/g, ((objdate.getMonth()+1) <10) ? (ZERO + (objdate.getMonth()+1)) : objdate.getMonth()+1)  // = number of the month : 01 to 12
										.replace(/%n%/g, objdate.getMonth()+1)  // 8, 9, 10, (no leading 0)
										.replace(/%F%/g, fullmonthname[objdate.getMonth()])  // full month name
										.replace(/%M%/g, abbrmonthname[objdate.getMonth()])  // abbreviated month name
										// Week
										.replace(/%W%/g, ((objdate.getWeek()) <10) ? (ZERO + (objdate.getWeek())) : objdate.getWeek())  // = number of the week : 01 to 54
										.replace(/%w%/g, objdate.getDay())  // = Day of the week, from 0 (sunday) to 6 (saturday)
										.replace(/%l%/g, fulldayname[objdate.getDay()])  // = Full day name
										.replace(/%D%/g, abbrdayname[objdate.getDay()])  // = Abbreviated day name
										// Day
										.replace(/%d%/g, ((objdate.getDate()) <10) ? (ZERO + (objdate.getDate())) : objdate.getDate())  // = number of the day : 01 to 31
										.replace(/%j%/g, objdate.getDate())  // = number of the day  1 to 31 (no leading 0)
										// ASF
										.replace(/%asf_D%/g, domain)       // downloaded File's domain
										.replace(/%asf_F%/g, filename)     // downloaded File's filename with extension
										.replace(/%asf_Fx%/g, file_name)   // downloaded File's filename without extension
										.replace(/%asf_d%/g, asf_domain)   // matching filter's Domain (without special chars used by regexp)
										.replace(/%asf_f%/g, asf_filename) // mathching filter's filename (without special chars used by regexp)
										.replace(/%asf_x%/g, extension[0]);    // match the filename extension (without the dot)
		// debug
		// alert (path);
		return path;
		
// Canceled the folder creation script, so the folder will not be created if the user cancel the download
// Firefox will create it automatically when accepting the download... under windows XP and Linux Ubuntu at least (not tested under Vista, MacOS, or any other operating system)
/*
		var directory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		
		directory.initWithPath(path);
		if (directory.exists())
		{
			return path;
		}
		else  // if it doesn't exist, create it
		{
			if( !directory.exists() || !directory.isDirectory() )
			{
				directory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0777);
			}
			return path;
		}
*/
	},
	
	
	trim: function (string)	{
		return string.replace(/(^\s*)|(\s*$)/g,'');
	},
	
	
	show_dloptions: function ()	{
		// read asf/content/info_save_ff2-3.txt for differences between Firefox 2 and Firefox 3 saving preferences.
		var asf_dloptions = document.getElementById('asf_dloptions');
		var asf_radiogroup_pathselect = document.getElementById('asf_radiogroup_pathselect');
		var asf_savefolder = document.getElementById('asf_savefolder');
		var asf_folder_list = document.getElementById('asf_folder_list');
		var asf_viewdloption = this.prefManager.getBoolPref("extensions.asf.viewdloption");
		var asf_viewdloptionType = this.prefManager.getIntPref("extensions.asf.viewdloptionType");
		var asf_viewpathselect = this.prefManager.getBoolPref("extensions.asf.viewpathselect");
		var useDownloadDir = this.prefManager.getBoolPref("browser.download.useDownloadDir");
		var folderList = this.prefManager.getIntPref("browser.download.folderList");
		
		var folder = "";
		if (this.firefoxversion == 2) folder = this.loadUnicodeString("browser.download.dir");
		if (this.firefoxversion == 2) // set the show suggested path to "..." because I didn't find how to read the default donloads folder path. (See function Set_savepath(); )
		{
			if (useDownloadDir && folderList == 0)  // desktop
			{
				folder = "...";
			}
			if (useDownloadDir && folderList == 1) // default Downloads folder
			{
				folder = "...";
			}
		}
		if (this.firefoxversion == 3)
		{
		
			var inPrivateBrowsing = false;
			try {
				var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]
									.getService(Components.interfaces.nsIPrivateBrowsingService);
				inPrivateBrowsing = pbs.privateBrowsingEnabled;
			}
			catch (e) { // nsIPrivateBrowsingService not working on FF2 and 3.0
			}
			
			if (inPrivateBrowsing && gDownloadLastDir.file)
			{
				folder = gDownloadLastDir.file.path;
			}
			else
			{
				folder = this.loadUnicodeString("browser.download.lastDir");
			}
			
		}
		
		
		
		// check the lastpath, if different than current folder, then print radio choice to user
		// so he can choose from found filters, or last used path.
		var lastpath = this.loadUnicodeString("extensions.asf.lastpath");
		var asf_lastpath = document.getElementById('asf_lastpath');
		
		if ( (lastpath == folder) || (lastpath == "") )  // if same or empty (first time using ASF), do not show radio for lastpath choice
		{
			asf_lastpath.hidden = true;
		}
		else  // else, if last path is different than folder found in filter, show a choice
		{
			asf_lastpath.hidden = false;
		}
		
		//set the text to be written on the Radio comment
		asf_savefolder.label = folder;
		asf_lastpath.label = lastpath;
		
		// Force check the first radio choice (needed on linux + ff2.x) (linux has blank radio choices on loading, this is only visual, it doesn't affect anything here, the value are set to the new path by default until the user change the radio choice)
		var asf_radio_savepath = document.getElementById('asf_radio_savepath');
		asf_radio_savepath.value = 0;
		
		
		//now, if the user checked the option to view asf on saving window, set it to visible
		if(asf_viewdloption == true)
		{
			if(asf_viewdloptionType == 0) asf_dloptions.style.visibility = "visible";
			
			if(asf_viewdloptionType == 1)
			{
				asf_dloptions.style.visibility = "visible";
				document.getElementById('asf_dloptions_content').style.visibility = "collapse";
			}
			
			
			
			//and last, if the user checked the option to view the path list on saving window, set it to visible
			if((asf_viewpathselect == true) && (this.prefManager.getIntPref("extensions.asf.filtersNumber") > 0) )
			{
				this.read_all_filterpath();
				asf_radiogroup_pathselect.style.visibility = "visible";
			}
			else
			{
				asf_radiogroup_pathselect.style.visibility = "collapse";
			}
			
			// Check if the user use the "do not show file explorer" to automatically save to "desktop" or "downloads" and force the suggested path to those folders instead of found filters
			if((useDownloadDir == true) && (folderList != 2)) // if set to desktop or Download
			{
				asf_radio_savepath.disabled = true;
				asf_radiogroup_pathselect.disabled = true;
				asf_folder_list.disabled = true;
			}
			else
			{
				asf_radio_savepath.disabled = false;
				asf_radiogroup_pathselect.disabled = false;
				asf_folder_list.disabled = false;
			}
			
			
			// Set the max width to the size of the screen minus 200px. Added for Mac OSX users with long path choice.
			// alert("first screen : " + screen.width + "x" + screen.height);
			asf_dloptions.style.maxWidth = screen.width -200 +"px";
		}
	},
	
	
	toggle_dloptionsContent: function(){
		var asf_dloptions_content = document.getElementById('asf_dloptions_content').style.visibility;
		var asf_viewpathselect = this.prefManager.getBoolPref("extensions.asf.viewpathselect");
		
		document.getElementById('asf_dloptions_content').style.visibility = (asf_dloptions_content == "visible" ? "collapse" : "visible");
		if (asf_viewpathselect) // fix for linux (nested box visibility doesn't work)
		{
			document.getElementById('asf_radiogroup_pathselect').style.visibility = (asf_dloptions_content == "visible" ? "collapse" : "visible");
		}
		window.sizeToContent();
	},
	
	
	check_uCTOption: function (FirstTime) {
		// Check if the user change the unkownContentType option (open with, save as, save with a download manager, etc.)
		var save = document.getElementById("save").selected;
		var asf_radio_savepath = document.getElementById('asf_radio_savepath');
		var asf_radiogroup_pathselect = document.getElementById('asf_radiogroup_pathselect');
		var asf_folder_list = document.getElementById('asf_folder_list');
		var asf_viewdloption = this.prefManager.getBoolPref("extensions.asf.viewdloption");
		var asf_viewdloptionType = this.prefManager.getIntPref("extensions.asf.viewdloptionType");
		var asf_viewpathselect = this.prefManager.getBoolPref("extensions.asf.viewpathselect");
		
		// Workaround for bug 439323 (if call when not needed, dosen't work anymore)
		// https://bugzilla.mozilla.org/show_bug.cgi?id=439323
		var initialState = document.getElementById('asf_dloptions_content').style.visibility ;
		
		if (asf_viewdloption)
		{
			if(save) // if set to "save the file"
			{
				asf_radio_savepath.disabled = false;
				asf_radiogroup_pathselect.disabled = false;
				asf_folder_list.disabled = false;
				if ((asf_viewdloptionType == 2) || (asf_viewdloptionType == 3))
				{
					document.getElementById('asf_dloptions').style.visibility = "visible";
					document.getElementById('asf_dloptions_content').style.visibility = "visible";
					if (asf_viewpathselect) // fix for linux (nested box visibility doesn't work)
					{
						document.getElementById('asf_radiogroup_pathselect').style.visibility = "visible";
					}
				}
			}
			else
			{
				asf_radio_savepath.disabled = true;
				asf_radiogroup_pathselect.disabled = true;
				asf_folder_list.disabled = true;
				if (asf_viewdloptionType == 2) // minimize only
				{
					document.getElementById('asf_dloptions').style.visibility = "visible";
					document.getElementById('asf_dloptions_content').style.visibility = "collapse";
					document.getElementById('asf_radiogroup_pathselect').style.visibility = "collapse"; // fix for linux (nested box visibility doesn't work)
				}
				if (asf_viewdloptionType == 3)
				{
					document.getElementById('asf_dloptions').style.visibility = "collapse";
					document.getElementById('asf_dloptions_content').style.visibility = "collapse";
					document.getElementById('asf_radiogroup_pathselect').style.visibility = "collapse"; // fix for linux (nested box visibility doesn't work)
				}
			}
			
			if ( (initialState != document.getElementById('asf_dloptions_content').style.visibility) && (FirstTime != true) ) // FirstTime is also a workaround of sizeToContent bug (which is called onLoad uCT)
			{
				window.sizeToContent();
			}
		}
	},
	
	
	indexInArray: function (arr,val){
		val = val.replace(/\\/g,'\\\\');
		var test_regexp = new RegExp("^"+val+"$");
		var data = "";
		for(var i=0;i<arr.length;i++)
		{
			if(test_regexp.test(arr[i])) return i;
		}
		return -1;
	} ,
	
	
	read_all_filterpath: function() {
		var variable_mode = this.prefManager.getBoolPref("extensions.asf.variablemode");
		var list = document.getElementById('asf_folder_list');
		var menupopup = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'menupopup');
		
		// Check if there is any filter in list
		var nbrfilters = 	this.prefManager.getIntPref("extensions.asf.filtersNumber");
		var path = "";
		
		// Delete active list before repopulating (if editing filter and coming back to saving window)
		for (var i=list.childNodes.length-1 ; i>=0 ; i--)
		{
			list.removeChild(list.childNodes[i]);
		}
		
		// Write each path to the menupopup
		var pathlist = new Array();
		var pathlist_defaultforceontop = this.readHiddenPref("extensions.asf.pathlist_defaultforceontop", "bool", false); // let the user choose in next release.
		var defaultfolder = this.loadUnicodeString("extensions.asf.defaultfolder");
		var j = 0;
		if (pathlist_defaultforceontop)
		{
			var menuitem = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'menuitem');
			menuitem.setAttribute('label', defaultfolder);
			menuitem.setAttribute('crop', 'center');
			menuitem.setAttribute('value', defaultfolder);
			menupopup.appendChild(menuitem);
		}
		else
		{
			pathlist[0] =  variable_mode == true? this.createfolder(defaultfolder) : defaultfolder;
			j++;
		}
		
		for (var i = 0; i < nbrfilters; i++)
		{
			// read the filter number x
			path = this.loadUnicodeString("extensions.asf.filters"+ i +".folder");
			path = variable_mode == true? this.createfolder(path, i) : path;
			
			if (this.indexInArray(pathlist, path) < 0)
			{ 
				pathlist[j++]= path;
			}
		}
		
		var pathlist_sort_alpha = this.readHiddenPref("extensions.asf.pathlist_alphasort", "bool", true); // let the user choose in next release.
		if (pathlist_sort_alpha) pathlist.sort();
		
		
		for (var i = 0; i < pathlist.length; i++)
		{
			path = pathlist[i];
			
			var menuitem = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'menuitem');
			menuitem.setAttribute('label', path);
			menuitem.setAttribute('crop', 'center');
			menuitem.setAttribute('value', path);
			menuitem.setAttribute('oncommand', "automatic_save_folder.asf_select_savepath(this)");
			menupopup.appendChild(menuitem);
		}
		
		// Populate the path list into the menu
		list.appendChild(menupopup);
		list.selectedIndex = 0;
	},
	
	
	asf_toggle_savepath: function () {
		
		var asf_savefolder = document.getElementById('asf_savefolder');
		var asf_lastpath = document.getElementById('asf_lastpath');
		var asf_pathselect = document.getElementById('asf_pathselect');
		var userchoice = "";
		
		if(asf_savefolder.selected == true)
		{
			userchoice = asf_savefolder.label ;
		}
		
		if(asf_lastpath.selected == true)
		{
			userchoice = asf_lastpath.label ;
		}
		
		if(asf_pathselect.selected == true)
		{
			// read the current selected item value
			var asf_folder_list = document.getElementById('asf_folder_list');
			userchoice = asf_folder_list.value ;
		}
		
		this.set_savepath(userchoice);
		
	},
	
	
	asf_select_savepath: function () {
	
		// check the third radio choice
		var asf_radio_savepath = document.getElementById('asf_radio_savepath');
		var asf_pathselect = document.getElementById('asf_pathselect');
		asf_radio_savepath.value = 2;
		asf_pathselect.checked;
		
		this.asf_toggle_savepath();
	},
	
	
	test_regexp: function (filters, string) {
		
		// Steps :
		// 1 - Check if the filter is a regular expression
		// 2 - if not regexp : add the backslah to special characters and .* to the start and end of the string to convert it into a regexp form
		//		if it's already regexp : delete the / / for new regexp() to handle it
		// 3 - when all is ready in regexp, test the data with the filters
		// 4 - if the data match the filter --> return true
		
		// 3 & 4 replaced with Ted script, now it returns the matching result's array, or false if nothing matched.
		
		
		// step  1
		var test_regexp = this.is_regexp(filters);   // True or False
		
		// step 2
		if (test_regexp == false) // replace simple wildcard and special characters with corresponding regexp
		{
			filters = filters.replace(/\./gi, "\\.")
													.replace(/\*/gi, ".*")
													.replace(/\$/gi, "\\$")
													.replace(/\^/gi, "\\^")
													.replace(/\+/gi, "\\+")
													.replace(/\?/gi, ".")
													.replace(/\|/gi, "\\|")
													.replace(/\[/gi, "\\[")
													.replace(/\//gi, "\\/");
			filters = ".*"+filters+".*";
		}
		else // remove the first and last slash
		{
			filters = filters.substring(1, filters.length);
			filters = filters.substring(0, filters.length -1);
		}
		
		// initialize the regular expression search
		var param = "";
		var regexp_caseinsensitive = this.readHiddenPref("extensions.asf.regexp_caseinsensitive", "bool", true); // let the user choose in next release.
		if (regexp_caseinsensitive) param = "i";
		var test_regexp = new RegExp(filters, param);  // put the slash back and the gi option (g = global seach, i = case insensitive)
		// Edited to only "i" option by Ted.
		
		// Step 3 & 4
		// if (string.match(test_regexp)) // if something match
		// {
		//	 return(true);
		// }
		
		// return(false);
		
// Ted Gifford, start block
		var res = string.match(test_regexp);
		if (res) return res;
		return false
// Ted Gifford, end block
		
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
	
	
	readHiddenPref: function(pref_place, type, ret) {
		try 
		{
			switch (type)
			{
				case "bool": return this.prefManager.getBoolPref(pref_place);
				case "int" : return this.prefManager.getIntPref(pref_place);
				case "char": return this.prefManager.getCharPref(pref_place);
				case "complex": return this.prefManager.getComplexValue(pref_place, Components.interfaces.nsISupportsString).data;
			}
		} 
		catch(e) 
		{
			return ret; // return default value if pref doesn't exist
		} 
	}
};

	addEventListener( // Autoload
	"load",			// After OnLoad from overlay_unknownContentType.xul file
	function(){ automatic_save_folder.main(); },  // Run main from automatic_save_folder to check the filters
	false
	);

	addEventListener(
	"command",		// After a click in the unknownContentType.xul, check if the user changed the saving option (save, open, etc.)
	function(){ automatic_save_folder.check_uCTOption(); },  // Run main from automatic_save_folder to check the filters
	false
	);
