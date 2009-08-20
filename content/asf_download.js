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
 var automatic_save_folder = {
		prefManager: Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch),
						
		appInfo: Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo),
						
		versionChecker: Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                               .getService(Components.interfaces.nsIVersionComparator),
							   
	asf_setdir: function () {
		// I don't understand why "this".function_name doesn't work with addEventListener even using "with" method, only onclick from the Xul events works. 
		// So I use this tweak to call functions and properties from its name "automatic_save_folder" instead of "this"
		
		// Setting private variables usable in this function
		var prefManager = automatic_save_folder.prefManager;		
		var versionChecker = automatic_save_folder.versionChecker;
		var appInfo = automatic_save_folder.appInfo;
		var ASF = automatic_save_folder; // ASF is just a shortcut to automatic_save_folder
		
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
		var domain = 		document.getElementById("source").value ;
		var filename = 		document.getElementById("location").value ;
		
		// debug : show the full downloaded link  http://abc.xyz/def/file.ext
		// Can use this new function to get free from the need of the download window.
		//var url = dialog.mLauncher.source.spec;
		//alert(url);
		
		
		
		
		// load prefmanager data
		var savetype = 			prefManager.getIntPref("extensions.asf.savetype");	
		var lastdir = 			prefManager.getBoolPref("extensions.asf.lastdir");	
		var defaultfolder = 	ASF.loadUnicodeString("extensions.asf.defaultfolder");		
		var keeptemp = 			prefManager.getBoolPref("extensions.asf.keeptemp");
		var tempdomain = 		ASF.loadUnicodeString("extensions.asf.tempdomain");
		var variable_mode = 	prefManager.getBoolPref("extensions.asf.variablemode");
		
		// If variable/Advanced mode is ON, let's check the variables and replace to create the new defaultfolder
		if (variable_mode == true) 
		{
			defaultfolder = ASF.createfolder(defaultfolder);
		}
		
		// set the last folder path used into asf.lastpath
		if (firefoxversion == "3")   // take the download.lastDir if it's FF3
		{
			var folder = ASF.loadUnicodeString("browser.download.lastDir");
			if (folder == "") 
			{ // it's when lastDir doesn't exist yet, ff3 bug ?
			}
		}
		else // else if it's not FF3 (it's 1.5 or 2), read Download.dir
		{
			var folder = ASF.loadUnicodeString("browser.download.dir");
		}
		ASF.saveUnicodeString("extensions.asf.lastpath", folder); // And set it to asf.lastpath to be compared later with the new path the filters will set to lastDir (or dir)
		
		
		
		
		// load filters data from prefmanager into filters[]
		// filters[filternumber][label]		
		var filters = new Array();
		for ( var i = 0 ; i < nbrfilters ; i++)
		{
			var dom = ASF.loadUnicodeString("extensions.asf.filters"+ i +".domain");
			var fil = ASF.loadUnicodeString("extensions.asf.filters"+ i +".filename");		
			var fol = ASF.loadUnicodeString("extensions.asf.filters"+ i +".folder");		
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
				dom_regexp = ASF.test_regexp(filters[i][0], "source");  // hosted Domain
				
			// Check the referer domain name if hosted domain checking returned false. In next releases, will be a proper option
				if (dom_regexp == false)
				{
					dom_regexp = ASF.test_regexp(filters[i][0], "referer"); // check the filter domain with the Referer domain only if the hosted domain doesn't match
				}
				
			// Check the filename	
				file_regexp = ASF.test_regexp(filters[i][1], "location"); // Filename
				
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
					ASF.saveUnicodeString("browser.download.dir", defaultfolder);
					if (lastdir == true) // set it for "save as..." on FF1.5 and FF2, on FF3 lastdir is always true
					{
						ASF.saveUnicodeString("browser.download.lastDir", defaultfolder);
					}	
				}	
				else  // else, if domain is the same as the last, set the download.dir to the last folder used (else viewDownloadOption will not show the correct save path and will use the default folder)
				{     // only affect Firefox3 which update download.lastDir instead of download.dir, so taking download.lastDir data to set download.dir, 
					  // FF1.5 or FF2 automatically update download.dir, not download.lastDir
					if (firefoxversion == "3")
					{
						var lastpath = ASF.loadUnicodeString("browser.download.lastDir");  // this one is the one that will open
						if (lastpath == "") // if no path is returned (first time using lastDir, or the user reseted the content manually in about:config)
						{
							ASF.saveUnicodeString("browser.download.lastDir", defaultfolder);
							lastpath = defaultfolder;
						}
						ASF.saveUnicodeString("browser.download.dir", lastpath);   // this one is the one that will be shown in ASF save option
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
					var lastpath = ASF.loadUnicodeString("browser.download.lastDir");
					if (lastpath == "") // if no path is returned (first time using lastDir, or the user reseted the content manually in about:config)
					{
						ASF.saveUnicodeString("browser.download.lastDir", defaultfolder);
						lastpath = defaultfolder;
					}
					ASF.saveUnicodeString("browser.download.dir", lastpath);
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
			
			
			
				folder = ASF.createfolder(folder, idx);		
			}
			
			ASF.saveUnicodeString("browser.download.dir", folder);
			if (lastdir == true) // set it for "save as..." on FF1.5 and FF2, on FF3 lastdir is always true
			{
				ASF.saveUnicodeString("browser.download.lastDir", folder);
			}	
		}
		
		// in every case, set the new file hosted domain to tempdomain
		ASF.saveUnicodeString("extensions.asf.tempdomain", domain);
		
		// show or hide the asf option on saving window
		ASF.show_dloptions();

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
		
		var objdate = new Date();
		
		// make the array with the month's name in the stringbundle of the locale language path.

		var stringbundle = document.getElementById('automatic_save_folder_bundles');

		var fullmonthname = new Array();
		var abbrmonthname = new Array();
		for (var i = 1 ; i<= 12 ; i++)
		{
			fullmonthname[i-1] = stringbundle.getString("month"+i+"_full");
			abbrmonthname[i-1] = stringbundle.getString("month"+i+"_abbr");
		}
		
		
		const ZERO = "0";  // leading zero
		
		// load the domain and the filename of the saved file	
		var domain = 	document.getElementById("source").value ;
			domain = domain.replace(/^.*:\/\//g,'');  // remove the protocol name from the domain
		var filename = 	document.getElementById("location").value ;
		var file_name = filename.replace (/\.(?!.*\.).*$/i, "");  // Trim from the last dot to the end of the file = remove extension
		var extension = filename.match(/([^\.]*)$/i);  // take out the extension (anything not containing a dot, with an ending line)
		
		
		
		
		
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
	

	show_dloptions: function ()	{
		
		var asf_dloptions = document.getElementById('asf_dloptions');
		var asf_radiogroup_pathselect = document.getElementById('asf_radiogroup_pathselect');
		var asf_savefolder = document.getElementById('asf_savefolder');
		var asf_viewdloption = this.prefManager.getBoolPref("extensions.asf.viewdloption");	
		var asf_viewpathselect = this.prefManager.getBoolPref("extensions.asf.viewpathselect");	
		var folder = this.loadUnicodeString("browser.download.dir");
		
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
		if(asf_viewdloption == true) asf_dloptions.style.visibility = "visible";
		
		//and last, if the user checked the option to view asf on saving window, set it to visible
		if((asf_viewpathselect == true) && (this.prefManager.getIntPref("extensions.asf.filtersNumber") > 0) )
		{
			this.read_all_filterpath();
			asf_radiogroup_pathselect.style.visibility = "visible";
		}		
		
		
		
		
		// Set the max width to the size of the screen minus 200px. Added for Mac users with long path choice.
		// alert("first screen : " + screen.width + "x" + screen.height);
		asf_dloptions.style.maxWidth = screen.width -200 +"px";
		
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
		var ASF = automatic_save_folder; // ASF is just a shortcut to automatic_save_folder
		var variable_mode = ASF.prefManager.getBoolPref("extensions.asf.variablemode");
		var list = document.getElementById('asf_folder_list');
		var menupopup = document.createElement('menupopup');
		
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
		pathlist[0] = this.loadUnicodeString("extensions.asf.defaultfolder");
		var j = 0;
		for (var i = 0; i < nbrfilters; i++)
		{
		// read the filter number x
		path = this.loadUnicodeString("extensions.asf.filters"+ i +".folder");
		
		if ( ASF.indexInArray(pathlist, path) < 0) { pathlist[++j]= path;}
		}
		
		var pathlist_sort_alpha = true;   // let the user choose in next release.
		if (pathlist_sort_alpha) pathlist.sort(); 
		
		for (var i = 0; i < pathlist.length; i++)
		{
		path = pathlist[i];
		path = variable_mode == true? ASF.createfolder(path) : path; 
		var menuitem = document.createElement('menuitem');
		menuitem.setAttribute('label', path);
		menuitem.setAttribute('crop', 'center');
		menuitem.setAttribute('value', path);
		menuitem.setAttribute('oncommand', "automatic_save_folder.asf_select_savepath(this)");
		menupopup.appendChild(menuitem);
		}
		
		// Populate the path list into the menu
		list.appendChild(menupopup);
		
	},	
	
	
	asf_toggle_savepath: function () {
	
		var lastdir = this.prefManager.getBoolPref("extensions.asf.lastdir");	
		
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
		
		
		this.saveUnicodeString("browser.download.dir", userchoice);
		if (lastdir == true) // set it for "save as..." on FF1.5 and FF2, on FF3 lastdir is always true
		{
			this.saveUnicodeString("browser.download.lastDir", userchoice);
		}	
	 
	},


	asf_select_savepath: function () {	
	
		var lastdir = this.prefManager.getBoolPref("extensions.asf.lastdir");	
		
		// check the third radio choice
		var asf_radio_savepath = document.getElementById('asf_radio_savepath');
		asf_radio_savepath.value = 2;
		
		// read the selected item value
		var asf_folder_list = document.getElementById('asf_folder_list');
		
		this.saveUnicodeString("browser.download.dir", asf_folder_list.value);
		if (lastdir == true) // set it for "save as..." on FF1.5 and FF2, on FF3 lastdir is always true
		{
			this.saveUnicodeString("browser.download.lastDir", asf_folder_list.value);
		}
	},
	
	test_regexp: function (filters, input) {

		// input can be "source" for domain name, "location" for file name,  ...
		if ( (input == "source") || (input == "location") )
		{	
			var string = document.getElementById(input).value ;
		}
		// ... or "referer" for referer's domain name (the place where the link is, and not the file)
		else // if (input == "referer")
		{
			var uCT = document.getElementById("unknownContentType");
			var string = uCT.parentNode.defaultView.opener.location.host; // look for the referer host name in the DOM.
		}
		
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
       return res;
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

	
};
	// addEventListener( // Autoload
	// "load",			// After OnLoad from overlay_unknownContentType.xul file
	// automatic_save_folder.asf_setdir,		// Run asf_setdir from automatic_save_folder to check the filters
	// true
	// );
	
	with(automatic_save_folder){
		addEventListener( // Autoload
		"load",			// After OnLoad from overlay_unknownContentType.xul file
		asf_setdir,		// Run asf_setdir from automatic_save_folder to check the filters
		false
		);	
	}