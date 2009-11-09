/* ***** BEGIN LICENSE BLOCK *****
Automatic Save Folder
Copyright (C) 2007-2009 Eric Cassar (Cyan).
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
var ORIG_getTargetFile = window.getTargetFile;
// alert (ORIG_getTargetFile);  // uncomment to get the Firefox's getTargetFile current version in an alert box at Firefox launch. Can be copy/pasted.
							 // or can be found in install folder : Mozilla Firefox\chrome\toolkit.jar\content\global\contentAreaUtils.js
var asf_rightclick_loaded;

var automatic_save_folder = {
	prefManager: Components.classes["@mozilla.org/preferences-service;1"]
						.getService(Components.interfaces.nsIPrefBranch),
						
	appInfo: Components.classes["@mozilla.org/xre/app-info;1"]
						.getService(Components.interfaces.nsIXULAppInfo),
					
	versionChecker: Components.classes["@mozilla.org/xpcom/version-comparator;1"]
						.getService(Components.interfaces.nsIVersionComparator),
					
					
	rightclick_init: function() {
		if (!asf_rightclick_loaded) 
		{
			asf_rightclick_loaded = true;	
			
			// Right-click feature doesn't work on Firefox 2 (Can't detect installed add-on and prevent conflict with Download Sort)
			if (this.versionChecker.compare(this.appInfo.version, "3.0") >= 0)
			{
				var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
					
				//replace original Rightclick menu with ASF Rightclick menu
				// Not compatible with Download Sort extension (same function modification, it will conflict).
				// Detect if Download Sort is installed and enabled, and activate ASF rightclick only if DSort is not already loaded.
				var enabledItems = prefs.getCharPref("extensions.enabledItems");
				var dsort_GUUID = "{D9808C4D-1CF5-4f67-8DB2-12CF78BBA23F}";
				var DownloadSort = enabledItems.indexOf(dsort_GUUID,0);
				
				if (DownloadSort == -1)  // Download Sort is not enabled, load ASF rightclick replacement && Firefox 2.0 min
				{
					// Not working like I would like :(
					/*
					// Replace first line of ORIGinal firefox rightclick function, to add ASF function to it. might Works with every firefox version :) 
					var asf_getTargetFile = ORIG_getTargetFile.toString().replace("const prefSvcContractID","automatic_save_folder.rightclick_setdir(aFpP);const prefSvcContractID");
					asf_getTargetFile = new Function("aFpP","aSkipPrompt", asf_getTargetFile);
					alert(asf_getTargetFile);
					window.getTargetFile = asf_getTargetFile;
					*/
					
					// replace the ORIGinal firefox function with the custom one. (original from Firefox 3.5.4) 
					window.getTargetFile = this.asf_getTargetFile;
					
					if (this.versionChecker.compare(this.appInfo.version, "3.0") >= 0)
					{
						// Starting from firefox 3.0 there is a timeout when downloading with right-click to read header(Content-Disposition:) to rename the file in the file_explorer suggested filename.
						// When timeout is set to 1000 ms (default), ASF right-click filtering is not working.
						// When timeout is set to 0ms, ASF right-click filtering is working, but header renaming is not working anymore.
						// And when set to ~8ms, Header renaming is working but ASF is filtering on the previous filename (before the renaming).
						
						// Set to 0 only when the user want to use it
						var asf_rightclick = prefs.getBoolPref("extensions.asf.rightclick");
						prefs.setIntPref("browser.download.saveLinkAsFilenameTimeout", asf_rightclick == true ? 0 : 1000);
						
						// and set it back to 1000 (default) when exiting Firefox
						// to prevent blocking the user to 0 if add-on is removed without reseting the timeout first.
						// (From Download sort extension)
						var obsSvc = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
						obsSvc.addObserver(this.asf_quitObserver, "quit-application-requested", false);
					}
				}
			}
		}
		
	},	
		
	
	// reset Timelimit=0 to =1000 when closing Firefox 
	// it will reset to 1000 even if closing firefox is canceled.
	// It will cause ASF right-click to stop working until the user accept any changes in ASF main preferences. 
	// I think it's very unlikly to happen to a lot of people, and is easily corrected by checking the preferences.
	asf_quitObserver: {
		observe: function(subject, topic, state) {
		
			//alert(topic);
			if(topic == "quit-application-requested") {
				var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
				prefs.setIntPref("browser.download.saveLinkAsFilenameTimeout", 1000);
			}
		}
	},
	
	
	
	// Original from firefox 3.5.3
	// I tried to "live-patch" the user function, using 
	// asf_getTargetFile = ORIG_getTargetFile.toString().replace("first line","first line + ASF")
	// But there's no way to revert it to a function, asf_getTargetFile = asf_getTargetFile.toFunction() is not working (it wrap it into an anonymous function).
	// See lines ~40 for the test
	asf_getTargetFile: function (aFpP, /* optional */ aSkipPrompt)
	{
		
		automatic_save_folder.rightclick_main(aFpP);
		
		const prefSvcContractID = "@mozilla.org/preferences-service;1";
		const prefSvcIID = Components.interfaces.nsIPrefService;                              
		var prefs = Components.classes[prefSvcContractID]
							.getService(prefSvcIID).getBranch("browser.download.");
		
		const nsILocalFile = Components.interfaces.nsILocalFile;
		
		var inPrivateBrowsing = false;
		try 
		{
			var pbs = Components.classes["@mozilla.org/privatebrowsing;1"]
							.getService(Components.interfaces.nsIPrivateBrowsingService);
			inPrivateBrowsing = pbs.privateBrowsingEnabled;
		}
		catch (e) {	}
		
		// For information on download folder preferences, see
		// mozilla/browser/components/preferences/main.js
		
		var useDownloadDir = prefs.getBoolPref("useDownloadDir");
		var dir = null;
		
		// Default to lastDir if useDownloadDir is false, and lastDir
		// is configured and valid. Otherwise, use the user's default
		// downloads directory configured through download prefs.
		var dnldMgr = Components.classes["@mozilla.org/download-manager;1"]
								.getService(Components.interfaces.nsIDownloadManager);
		try 
		{
			var lastDir;
			if (inPrivateBrowsing && gDownloadLastDir.file)
				lastDir = gDownloadLastDir.file;
			else
				lastDir = prefs.getComplexValue("lastDir", nsILocalFile);
			if ((!aSkipPrompt || !useDownloadDir) && lastDir.exists())
				dir = lastDir;
			else
				dir = dnldMgr.userDownloadsDirectory;
		} catch(ex) {
			dir = dnldMgr.userDownloadsDirectory;
		}
		
		if (!aSkipPrompt || !useDownloadDir || !dir || (dir && !dir.exists())) 
		{
			if (!dir || (dir && !dir.exists())) 
			{
				// Default to desktop.
				var fileLocator = Components.classes["@mozilla.org/file/directory_service;1"]
											.getService(Components.interfaces.nsIProperties);
				dir = fileLocator.get("Desk", nsILocalFile);
			}
			
			var fp = makeFilePicker();
			var titleKey = aFpP.fpTitleKey || "SaveLinkTitle";
			var bundle = getStringBundle();
			fp.init(window, bundle.GetStringFromName(titleKey), 
					Components.interfaces.nsIFilePicker.modeSave);
			
			fp.defaultExtension = aFpP.fileInfo.fileExt;
			fp.defaultString = getNormalizedLeafName(aFpP.fileInfo.fileName,
													aFpP.fileInfo.fileExt);
			appendFiltersForContentType(fp, aFpP.contentType, aFpP.fileInfo.fileExt,
										aFpP.saveMode);
			
			if (dir)
			fp.displayDirectory = dir;
			
			if (aFpP.isDocument) 
			{
				try {
					fp.filterIndex = prefs.getIntPref("save_converter_index");
				}
				catch (e) {}
			}
			
			if (fp.show() == Components.interfaces.nsIFilePicker.returnCancel || !fp.file)
			return false;
			
			// Do not store the last save directory as a pref inside the private browsing mode
			var directory = fp.file.parent.QueryInterface(nsILocalFile);
			if (inPrivateBrowsing)
			gDownloadLastDir.file = directory;
			else
			prefs.setComplexValue("lastDir", nsILocalFile, directory);
			
			fp.file.leafName = validateFileName(fp.file.leafName);
			aFpP.saveAsType = fp.filterIndex;
			aFpP.file = fp.file;
			aFpP.fileURL = fp.fileURL;
			
			if (aFpP.isDocument)
				prefs.setIntPref("save_converter_index", aFpP.saveAsType);
		}
		else 
		{
			dir.append(getNormalizedLeafName(aFpP.fileInfo.fileName,
											aFpP.fileInfo.fileExt));
			var file = dir;
			
			// Since we're automatically downloading, we don't get the file picker's 
			// logic to check for existing files, so we need to do that here.
			//
			// Note - this code is identical to that in
			//   mozilla/toolkit/mozapps/downloads/src/nsHelperAppDlg.js.in
			// If you are updating this code, update that code too! We can't share code
			// here since that code is called in a js component.
			var collisionCount = 0;
			while (file.exists()) 
			{
				collisionCount++;
				if (collisionCount == 1)
				{
					// Append "(2)" before the last dot in (or at the end of) the filename
					// special case .ext.gz etc files so we don't wind up with .tar(2).gz
					if (file.leafName.match(/\.[^\.]{1,3}\.(gz|bz2|Z)$/i))
						file.leafName = file.leafName.replace(/\.[^\.]{1,3}\.(gz|bz2|Z)$/i, "(2)$&");
					else
						file.leafName = file.leafName.replace(/(\.[^\.]*)?$/, "(2)$&");
				}
				else
				{
					// replace the last (n) in the filename with (n+1)
					file.leafName = file.leafName.replace(/^(.*\()\d+\)/, "$1" + (collisionCount+1) + ")");
				}
			}
			aFpP.file = file;
		}
		
		return true;
	},
	
	
	rightclick_main: function(aFpP) {
		
		//alert ("debug full uri : "+aFpP.fileInfo.uri.spec);
		//alert("ok");
		
		// Setting private variables usable in this function
		var prefManager = this.prefManager;		
		var versionChecker = this.versionChecker;
		var appInfo = this.appInfo;
		
		var firefoxversion = "";
		if(versionChecker.compare(appInfo.version, "3.0") >= 0) 
		{
			 firefoxversion = "3";			
		}
		else 
		{
			 firefoxversion = "2";
		}
		
		
		// Check if there is any filter in list
		var nbrfilters = 	prefManager.getIntPref("extensions.asf.filtersNumber");		
			
			
		// load the domain and the filename of the saved file (copy the data from the firefox saving window)
		// var domain = 		document.getElementById("source").value ;
		// var filename = 		document.getElementById("location").value ;
		
		var domain = aFpP.fileInfo.uri.scheme+"://"+aFpP.fileInfo.uri.host ;
		var filename = aFpP.fileInfo.fileName
		
		// For Ctrl+S, if pagename.ext is not on the URL document.title is used as filename, add .htm to the filename
		var page_title = document.title.replace(" - Mozilla Firefox", "");
		if (filename == page_title) filename = filename+".htm";
		
		
		// load prefmanager data
		var savetype = 			prefManager.getIntPref("extensions.asf.savetype");	
		var lastdir = 			prefManager.getBoolPref("extensions.asf.lastdir");	
		var defaultfolder = 	this.loadUnicodeString("extensions.asf.defaultfolder");		
		var keeptemp = 			prefManager.getBoolPref("extensions.asf.keeptemp");
		var tempdomain = 		this.loadUnicodeString("extensions.asf.tempdomain");
		var variable_mode = 	prefManager.getBoolPref("extensions.asf.variablemode");
		var dialogaccept = 		prefManager.getBoolPref("extensions.asf.dialogaccept");	
		var use_currentURL = 	prefManager.getBoolPref("extensions.asf.usecurrenturl");	
		
		// If variable/Dynamic folders mode is ON, let's check the variables and replace to create the new defaultfolder
		if (variable_mode == true) 
		{
			defaultfolder = this.createfolder(aFpP, defaultfolder);
		}
		
		// set the last folder path used into asf.lastpath
		if (firefoxversion == "3")   // take the download.lastDir if it's FF3
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
					var currentURL = document.getElementById("urlbar").value;
					dom_regexp = this.test_regexp(filters[i][0], currentURL); // check the filter domain with the current website URL only if the hosted domain doesn't match
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
					this.saveUnicodeString("browser.download.dir", defaultfolder);
					if (lastdir == true) // set it for "save as..." on FF1.5 and FF2, on FF3 lastdir is always true
					{
						this.saveUnicodeString("browser.download.lastDir", defaultfolder);
					}	
				}	
				else  // else, if domain is the same as the last, set the download.dir to the last folder used (else viewDownloadOption will not show the correct save path and will use the default folder)
				{     // only affect Firefox3 which update download.lastDir instead of download.dir, so taking download.lastDir data to set download.dir, 
					  // FF1.5 or FF2 automatically update download.dir, not download.lastDir
					if (firefoxversion == "3")
					{
						var lastpath = this.loadUnicodeString("browser.download.lastDir");  // this one is the one that will open
						if (lastpath == "") // if no path is returned (first time using lastDir, or the user reseted the content manually in about:config)
						{
							this.saveUnicodeString("browser.download.lastDir", defaultfolder);
							lastpath = defaultfolder;
						}
						this.saveUnicodeString("browser.download.dir", lastpath);   // this one is the one that will be shown in ASF save option
					}	
				}
			}
			else // else, if savetype == 0  (folder is set to last folder)
			{
				// set the download.dir to the last folder used (else viewDownloadOption will not show the correct save path and will use the default folder)
				// only affect Firefox3 which update download.lastDir instead of download.dir, so we are taking download.lastDir data to set download.dir, 
				//  FF1.5 or FF2 automatically update download.dir, not download.lastDir
				if (firefoxversion == "3")
				{
					var lastpath = this.loadUnicodeString("browser.download.lastDir");
					if (lastpath == "") // if no path is returned (first time using lastDir, or the user reseted the content manually in about:config)
					{
						this.saveUnicodeString("browser.download.lastDir", defaultfolder);
						lastpath = defaultfolder;
					}
					this.saveUnicodeString("browser.download.dir", lastpath);
				}	
			
			}
		}
		else // if a filter is found 
		{
			
			var folder = filters[idx][2];
			
			
			// If Advanced mode is ON, let's check the variables and create the folder
			if (variable_mode == true) 
			{

// Ted Gifford, start block		
			// String capture in filename with $f<1-9>
              try {
               //alert(file_regexp.length);
               if (file_regexp.length > 1)
               {
                       //alert('munging folder: ' + folder);
                       for (var replace_index = 1; replace_index < file_regexp.length; ++replace_index)
                               folder = folder.replace("$"+replace_index+"f", file_regexp[replace_index]);
                       //alert('munged folder: ' + folder);
               }
               } catch (e) {alert(e);}
			// String capture in domain with $d<1-9>
			  try {
               //alert(dom_regexp.length);
               if (dom_regexp.length > 1)
               {
                       //alert('munging folder: ' + folder);
                       for (var replace_index = 1; replace_index < dom_regexp.length; ++replace_index)
                               folder = folder.replace("$"+replace_index+"d", dom_regexp[replace_index]);
                       //alert('munged folder: ' + folder);
               }
               } catch (e) {alert(e);}			
// Ted Gifford, end	block
			
			
			
				folder = this.createfolder(aFpP, folder, idx);		
			}
			
			this.saveUnicodeString("browser.download.dir", folder);
			if (lastdir == true) // set it for "save as..." on FF1.5 and FF2, on FF3 lastdir is always true
			{
				this.saveUnicodeString("browser.download.lastDir", folder);
			}
		}
		
		// in every case, set the new file hosted domain to tempdomain
		this.saveUnicodeString("extensions.asf.tempdomain", domain);
		
		
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
	
	
	createfolder: function (aFpP, path, idx) {
		
		if (!path) return false;
		if (this.trim(path).length==0) return false;
		
		Date.prototype.getWeek = function() // Add the getWeek() function do date()
		{
			var onejan = new Date(this.getFullYear(),0,1);
			return Math.ceil((((this - onejan) / 86400000) + onejan.getDay()+1)/7);
		}
		var objdate = new Date();
		
		// make the array with the month's name in the stringbundle of the locale language path.
		
		var stringbundle = Components.classes['@mozilla.org/intl/stringbundle;1'].
											getService(Ci.nsIStringBundleService).  
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
		// var domain = 	document.getElementById("source").value ;
			// domain = domain.replace(/^.*:\/\//g,'');  // remove the protocol name from the domain
		// var filename = 	document.getElementById("location").value ;
		// var file_name = filename.replace (/\.(?!.*\.).*$/i, "");  // Trim from the last dot to the end of the file = remove extension
		// var extension = filename.match(/([^\.]*)$/i);  // take out the extension (anything not containing a dot, with an ending line)
		
		var domain = 	aFpP.fileInfo.uri.host ;
		var scheme = 	aFpP.fileInfo.uri.scheme ;
		var filename = 	aFpP.fileInfo.fileName ;
		var file_name = aFpP.fileInfo.fileBaseName ;
		var extension = aFpP.fileInfo.fileExt ;
		
		//alert ("domain = "+scheme+"://"+domain);
		
		// check the filter's data
		var asf_domain = "";
		var asf_filename = "";		
		if (idx) {  // If a filter match, idx is true
			asf_domain = this.loadUnicodeString("extensions.asf.filters"+ idx +".domain");
			// Trim the / / if domain is regexp
			if (this.is_regexp(asf_domain))
			{
				asf_domain = asf_domain.substring(1, asf_domain.length);
				asf_domain = asf_domain.substring(0, asf_domain.length -1);
			}
			asf_filename = this.loadUnicodeString("extensions.asf.filters"+ idx +".filename");
			// Trim the / / if filename is regexp
			if (this.is_regexp(asf_filename))
			{
				asf_filename = asf_filename.substring(1, asf_filename.length);
				asf_filename = asf_filename.substring(0, asf_filename.length -1);
			}
		}
		else // no filter is found, use actual Domain and filename without extension
		{
			asf_domain = domain;
			asf_filename = file_name;
		}
		
		// Check if asf_rd is present and process     asf_rd = Regexp the domain
		if (path.search("%asf_rd%") != -1)
		{
			// get the domain with the protocol
			var domainp = 	scheme+"://"+domain ;
			
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
					datareg = new RegExp(datareg, 'i');				//  create the regexp
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
					datareg = new RegExp(datareg, 'i');				//  create the regexp
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
		var directory = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
			
		directory.initWithPath(path);
		return path;
		
// Canceled the folder creation script, so the folder will not be created if the user cancel the download
// Firefox will create it automatically when accepting the download... under windows XP and Linux Ubuntu at least (not tested under Vista, MacOS, or any other operating system)
/*      
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
													.replace(/\*/gi, "(.)*")
													.replace(/\$/gi, "\\$")
													.replace(/\^/gi, "\\^")
													.replace(/\+/gi, "\\+")
													.replace(/\?/gi, ".")
													.replace(/\|/gi, "\\|")
													.replace(/\[/gi, "\\[")
													.replace(/\//gi,'\\/');
			filters = ".*"+filters+".*";
		}
		else // remove the first and last slash
		{
			filters = filters.substring(1, filters.length);
			filters = filters.substring(0, filters.length -1);
		}
		
		// initialize the regular expression search
		var test_regexp = new RegExp(filters, "i");  // put the slash back and the gi option (g = global seach, i = case insensitive)
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
	}
	
	
	}
	
	addEventListener( // Autoload
	"load",			// After OnLoad from overlay_unknownContentType.xul file
	function(){ automatic_save_folder.rightclick_init(); },  // Run main from automatic_save_folder to check the filters
	false
	);	