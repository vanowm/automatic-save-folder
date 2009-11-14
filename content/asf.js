/* ***** BEGIN LICENSE BLOCK *****
Automatic Save Folder
Copyright (C) 2007-2009 Eric Cassar (Cyan).

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
		
	asf_load: function () {
		
		if(this.versionChecker.compare(this.appInfo.version, "3.0") >= 0) 
		{
			this.firefoxversion = "3";
		}
		else 
		{
			this.firefoxversion = "2";
		}
		
		
		// init the preference for firefox 3
		if (this.firefoxversion == "3")
		{	
			// set lastdir to "enable" if the user just updated from previous version and had it disabled	
			var lastdir = document.getElementById("asf-lasdir");
			lastdir.checked = true;  	
			lastdir.hidden = true; // hidden on FF3, as lastdir must always be true, don't allow the user to disable it.
			this.prefManager.setBoolPref("extensions.asf.lastdir", true);
		}
		
		
		this.asf_loadpref();  // Load the preferences and the filter's array content
		this.asf_treeSelected(); // set the button to disabled state because no filter is selected when openning
		this.asf_toggleradio(); // set the radio choice to the right place
		this.asf_variablemode(); // check if variable mode is on or off, and change mode if needed
		this.asf_getdomain(); // Run this to get the current domain and filename from the download window to pre-fill the fields in "add filter".
		
		
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
		var nbrRow = this.prefManager.getIntPref("extensions.asf.filtersNumber", 0);
		
		//load the default folder (I removed the preference in options.xul, unicode folder's name didn't saved at all with automatic preference management. 
		// 							Manual saving is working, but not saving in the right encoding type in prefs.js, so we need to use get/setComplexValue)
		var default_folder = document.getElementById("asf-default-folder");
		default_folder.value = this.loadUnicodeString("extensions.asf.defaultfolder");
		
		for ( var i = 0 ; i < nbrRow ; i++)
		{
			var domain = this.loadUnicodeString("extensions.asf.filters"+ i +".domain");
			var filename = this.loadUnicodeString("extensions.asf.filters"+ i +".filename");		
			var folder = this.loadUnicodeString("extensions.asf.filters"+ i +".folder");		
			var active = this.prefManager.getBoolPref("extensions.asf.filters"+ i +".active");	
			
			// adding into the tree		
			var filter = document.getElementById('asf-filterList');
			var rules = document.getElementById('asf-filterChilds');
			var item = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treeitem');
			var row = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treerow');
			var c1 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c2 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');  
			var c3 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			var c4 = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'treecell');
			c1.setAttribute('label', domain);
			c2.setAttribute('label', filename);
			c3.setAttribute('label', folder);
			c4.setAttribute('value', active);
			c1.setAttribute('editable', false);
			c2.setAttribute('editable', false);
			c3.setAttribute('editable', false);
			row.appendChild(c1);
			row.appendChild(c2);
			row.appendChild(c3);
			row.appendChild(c4);
			item.appendChild(row);
			rules.appendChild(item);
				
		}
	},
	
	save_active_state: function() {
		//autosave the filterswhen clicking  (anywhere) on the filter tree
		// can't detect the "active" column statut with setting an attribute. The event is set to the tree not the cell.
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		if (instantApply)
		{
			//save the filters
			this.asf_savefilters();
		}
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
	},
	
	
	asf_toggleradio: function () {
		var select_last_radio = document.getElementById("asf-last-radio");
		var select_choose_radio = document.getElementById("asf-choose-radio");
		var select_folder_input = document.getElementById("asf-default-folder");
		var select_folder_btn = document.getElementById("asf-select-folder");
		var select_keeptemp_chk = document.getElementById("asf-keeptemp-check");
		var variable_mode = document.getElementById("asf-variablemode");
		
		if(select_last_radio.selected == true)
		{
			select_folder_input.disabled   = true;
			select_folder_btn.disabled   = true;
			select_keeptemp_chk.disabled = true;
		}

		if(select_choose_radio.selected == true)
		{
			select_folder_input.disabled = false;
			this.asf_variablemode();
			select_folder_btn.disabled   = false;
			select_keeptemp_chk.disabled = false;
		}
	},
	
	
	toggle_options: function () {  // called whenever the Options tab is selected
		var viewdloption = document.getElementById("asf-viewdloption");
		var viewpathlist = document.getElementById("asf-viewpathselect");
		var dialogaccept = document.getElementById("asf-dialogaccept");
		var useDownloadDir = document.getElementById("asf-useDownloadDir");
		
		// check if autosave is selected, if not : set the saving path to "filtered" and disable the dropdown menu.
		if (useDownloadDir.checked == false)
		{
			document.getElementById("asf-folderList").value = 2;
			document.getElementById("asf-folderList").disabled = true;
			this.prefManager.setIntPref("browser.download.folderList",2);
		}
		if (useDownloadDir.checked == true)
		{
			document.getElementById("asf-folderList").disabled = false;			
		}
		
		// if the option is opened from the saving window, disable the autosave feature (Not working when set from here.)
		dialogaccept.disabled = (window.opener.location == "chrome://mozapps/content/downloads/unknownContentType.xul") ? true : false ;
		
		if (viewdloption.checked == false)
		{
			viewpathlist.checked = false;
			viewpathlist.disabled = true;
		}
		if (viewdloption.checked == true)
		{
			viewpathlist.disabled = false;
		}
			
		// Check the right-click feature here, and prints text according to Firefox version and active addons
		// hide all the descriptions box, and unhide the needed one 
		document.getElementById("asf-rightclickdesc-ff2").hidden = true;     // Firefox 2, Right-click disabled message
		document.getElementById("asf-rightclickdesc-DSort").hidden = true;   // Download sort conflit alert
		var Dsort_installed = this.DownloadSort();
		
		if (this.firefoxversion == 2)
		{
			document.getElementById("asf-rightclick").hidden = true;          // Hide the right-click checkbox
			document.getElementById("asf-rightclickdesc").hidden = true;      // Hide the right-click description
			document.getElementById("asf-rightclickdesc-ff2").hidden = false; // Show right-click not working on Firefox 2.0
		}
		if (this.firefoxversion == 3)
		{
			if (Dsort_installed) // if Download sort is installed, display a message "right click disabled"
			{
				var asf_rightclick = document.getElementById("asf-rightclick");
				asf_rightclick.disabled = true;
				
				document.getElementById("asf-rightclickdesc").hidden = true;
				document.getElementById("asf-rightclickdesc-DSort").hidden = false;
			}
		}
		
	},
	
	
	toggle_rightclick: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		
		if (instantApply)
		{
		var status = document.getElementById("asf-rightclick").checked;
		this.prefManager.setIntPref("browser.download.saveLinkAsFilenameTimeout", status == true ? 0 : 1000 );
		}

	},
	
	
   asf_selecttab: function(tabID) {
	  
	  // Use this system for tab, because css for tab is not the same color as config window color, and I don't want to force any color by default so user can use new firefox theme's colors.
      document.getElementById("asf-tab-filters").hidden = true;
      document.getElementById("asf-tab-options").hidden = true;
      document.getElementById("asf-tab-dynamics").hidden = true;
      document.getElementById("asf-tab-help").hidden = true;
      document.getElementById("asf-tab-about").hidden = true;
	  
      
      document.getElementById(tabID).hidden = false;  
	  if(tabID == "asf-tab-options") this.toggle_options();
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
			var currentdomain = window.opener.document.getElementById("source").value;
			var currentfilename = window.opener.document.getElementById("location").value ;
			
			var domain = document.getElementById("asf-current-domain");
			var filename = document.getElementById("asf-current-filename");
			
			domain.value = currentdomain ;
			filename.value = currentfilename ;
		}
	},
	
	
	// Code from captain.at, modified by Cyan (CASSAR Eric)
	move: function (direction) {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		var treename = "asf-filterList";
		
		var tree = document.getElementById(treename);
		var idx = tree.currentIndex;
		if (idx == -1) return false;
		var maxidx = this.prefManager.getIntPref("extensions.asf.filtersNumber");
		
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
		var listBox = document.getElementById("asf-filterList");
		var idx  = listBox.currentIndex; //number of the selected line in tree
		var currentitem = tree.treeBoxObject.view.getItemAtIndex(idx);
			
		//event.dataTransfer.setData('application/x-moz-node', currentitem);  // send node data
		event.dataTransfer.setData('user/define', idx);  // send index data as text (but to prevent drop on text field, let's use custom set)
	},
	
	
	dragover: function (event) {
		//var isNode = event.dataTransfer.types.contains("application/x-moz-node");
		var isDefine = event.dataTransfer.types.contains("user/define");
		if (isDefine)
		{
			event.preventDefault();
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.dropEffect = "move";
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
			
			try 
			{
				var targetitem_idx = tree.treeBoxObject.getRowAt(event.pageX, event.pageY);
				var targetitem = tree.treeBoxObject.view.getItemAtIndex(targetitem_idx);
				var parent = targetitem.parentNode;		
				
				if (currentitem_idx > targetitem_idx) parent.insertBefore(currentitem, targetitem);
				if (currentitem_idx < targetitem_idx) parent.insertBefore(currentitem, targetitem.nextSibling);
				tree.view.selection.select(targetitem_idx); // reselect the moved filter
				
				// Now check is the user has InstantApply option to save the filter's order.
				var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
				if (instantApply)
				{
					//save the filters
					this.asf_savefilters();
				}
			}
			catch(e){} // if the user point outside of the filter tree (because using dragexit instead of dragdrop (dragdrop is not working)).
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
	browsedir: function () {
		var current_folder_input = document.getElementById("asf-default-folder").value;
		
		const nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		
		var filepickerdescription = this.stringbundle.GetStringFromName("select_default_folder");
		fp.init(window, filepickerdescription, nsIFilePicker.modeGetFolder);
		//fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.filterText);
		
		// locate current directory
		current_folder_input = this.createValidDestination(current_folder_input);	
		if (current_folder_input != false) fp.displayDirectory = current_folder_input;
		
		var rv = fp.show();
		if (rv == nsIFilePicker.returnOK)
		{
			var asf_url = fp.file.path;
			// Set the data into the input box
			document.getElementById("asf-default-folder").value = asf_url;
		}
		
		//needed to save unicode paths using instantApply
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
		if (instantApply)
		{
			//save the default folder right after editing
			var default_folder = document.getElementById("asf-default-folder").value;
			this.saveUnicodeString("extensions.asf.defaultfolder", default_folder);
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
		return directory;
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
	
	
	trim: function (string)	{
		return string.replace(/(^\s*)|(\s*$)/g,'');
	},
	
	
	DownloadSort: function() {	
		// Check for Download sort add-on, if enabled return true. (works only on 3.x)
		if (this.firefoxversion == 3)
		{
			var enabledItems = this.prefManager.getCharPref("extensions.enabledItems");
			var dsort_GUUID = "{D9808C4D-1CF5-4f67-8DB2-12CF78BBA23F}";
			var DownloadSort = enabledItems.indexOf(dsort_GUUID,0);
			
			if (DownloadSort >= 0) return true;
		}
		return false;	
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
         active = (active == "true" ? true : false) ;
         
         this.saveUnicodeString("extensions.asf.filters"+ i +".domain", domain);
         this.saveUnicodeString("extensions.asf.filters"+ i +".filename", filename);
         this.saveUnicodeString("extensions.asf.filters"+ i +".folder", folder);
         this.prefManager.setBoolPref("extensions.asf.filters"+ i +".active", active);
         
      }
	},
	
	
	asf_saveoptions: function() {
		//Save the View_path_list options
		var view_list = document.getElementById("asf-viewpathselect").checked;
		this.prefManager.setBoolPref("extensions.asf.viewpathselect",view_list)
		
		
		//save the rightclick (set timeout for header(Content-Disposition:) true = 0, false = 1000)
		// Only if DownloadSort is not enabled (prevent conflict)
		var Dsort_installed = this.DownloadSort();		
		if ((Dsort_installed == false) && this.firefoxversion == 3) // only for firefox 3, Firefox2 doesn't use timeout option
		{
			var rightclick = document.getElementById("asf-rightclick").checked;
			this.prefManager.setIntPref("browser.download.saveLinkAsFilenameTimeout", rightclick == true ? 0 : 1000);
		}

		
		//save the default folder (filters tab)
		var default_folder = document.getElementById("asf-default-folder").value;
		this.saveUnicodeString("extensions.asf.defaultfolder", default_folder);	

	},
	
	
	asf_savepref: function () {
	//save the filters
		this.asf_savefilters();
		
	//save the options
		this.asf_saveoptions();
		
	//close the options	
		window.close();
		if (window.opener.location == "chrome://mozapps/content/downloads/unknownContentType.xul") // if the option is opened from the saving window
		{ 	
			window.opener.automatic_save_folder.main();		// rescan the filters to set the good folder
			window.opener.sizeToContent();
		}		
		window.opener.focus;
	}
	
};