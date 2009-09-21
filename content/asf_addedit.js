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


	add_load: function () {
		
		var currentdomain = window.opener.document.getElementById("asf-current-domain").value;
		var currentfilename = window.opener.document.getElementById("asf-current-filename").value ;
		
		var radio_domain_all = window.document.getElementById("asf-addedit-radio-domain-all");
		var radio_domain_edited = window.document.getElementById("asf-addedit-radio-domain");
		var radio_filename_all = window.document.getElementById("asf-addedit-radio-filename-all");
		var radio_filename_edited = window.document.getElementById("asf-addedit-radio-filename");
		
		// enable or disable the local saving path text input
		var select_variable_mode = window.opener.document.getElementById("asf-variablemode");
		var select_folder_input = document.getElementById("asf-addedit-folder");
		if(select_variable_mode.checked == true)
		{
			select_folder_input.readOnly   = false;
		}
		if(select_variable_mode.checked == false)
		{
			select_folder_input.readOnly   = true;
		}
		
		// pre-filled data
		if (currentdomain != "") 
		{   // if opened from save window, domain and filename is autofilled, and radio need to be selected on 1 and value set to 1
			
			radio_domain_edited.checked;
			radio_filename_edited.checked;
			
			//set radio button to state 1 (if the user never clic on a radio, the value is null, even if the radio is selected at the right position)
			document.getElementById('radio-addedit-domain').value = 1 ;
			document.getElementById('radio-addedit-filename').value = 1 ;
			
			// set the data into the fields
			var domain = document.getElementById("asf-addedit-domain");
			var filename = document.getElementById("asf-addedit-filename");
			
			domain.value = currentdomain ;
			filename.value = currentfilename ;
			
		} // else, nothing to fill, radio button set to 0
		else 
		{
			radio_domain_all.checked;
			radio_filename_all.checked;
			
			//set radio button to state 0 (if the user never clic on a radio, the value is null, even if the radio is not checked)
			document.getElementById('radio-addedit-domain').value = 0 ;
			document.getElementById('radio-addedit-filename').value = 0 ;
		}
		
		sizeToContent();
		this.asf_toggleradio_domain();
		this.asf_toggleradio_filename();
	},
	
	
	edit_load: function () {

	sizeToContent();
	this.asf_loadData();
	this.asf_toggleradio_domain();
	this.asf_toggleradio_filename();
	}, 


	browsedir_addedit: function () {
		var current_folder_input = document.getElementById("asf-addedit-folder").value;
		var stringbundle = Components.classes['@mozilla.org/intl/stringbundle;1'].
											getService(Ci.nsIStringBundleService).  
                           createBundle('chrome://asf/locale/asf.properties');
				
		const nsIFilePicker = Components.interfaces.nsIFilePicker;
		var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
		
		var filepickerdescription = stringbundle.GetStringFromName("select_folder");
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
			document.getElementById("asf-addedit-folder").value = asf_url;
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


	asf_loadData: function () {
		// enable or disable the local saving path user input
		var select_variable_mode = window.opener.document.getElementById("asf-variablemode");
		var select_folder_input = document.getElementById("asf-addedit-folder");
		if (select_variable_mode.checked == true)
		{
			select_folder_input.readOnly   = false;
		}
		if (select_variable_mode.checked == false)
		{
			select_folder_input.readOnly   = true;
		}
		
		
		var tree = window.opener.document.getElementById("asf-filterList") ;
		var idx = tree.currentIndex;
		if (idx < 0) 
		{
			return;
		}
		
		var domain = tree.view.getCellText(idx,tree.columns.getColumnAt(0));
		var filename = tree.view.getCellText(idx,tree.columns.getColumnAt(1));
		var folder = tree.view.getCellText(idx,tree.columns.getColumnAt(2));
		var radio_domain = document.getElementById("radio-addedit-domain") ;		
		var radio_filename = document.getElementById("radio-addedit-filename") ;
		
		if (domain == "/.*/") 
		{
			radio_domain.value = 0;
		}
		else
		{
			radio_domain.value = 1;
			document.getElementById("asf-addedit-domain").value = domain;
			
			document.getElementById("asf-addedit-domain-regexp").checked = this.is_regexp(document.getElementById("asf-addedit-domain").value);
		}
		
		if (filename == "/.*/")
		{
			radio_filename.value = 0;
		}
		else
		{
			radio_filename.value = 1;
			document.getElementById("asf-addedit-filename").value = filename;
			
			document.getElementById("asf-addedit-filename-regexp").checked = this.is_regexp(document.getElementById("asf-addedit-filename").value);
		}
		
		document.getElementById("asf-addedit-folder").value = folder ;	
	},


	asf_toggleradio_domain: function ()	{
		var select_addedit_radio_all = document.getElementById("asf-addedit-radio-domain-all");
		var select_addedit_radio = document.getElementById("asf-addedit-radio-domain");
		var select_addedit_input = document.getElementById("asf-addedit-domain");
		var select_addedit_chk = document.getElementById("asf-addedit-domain-regexp");
		
		if (select_addedit_radio_all.selected == true)
		{
			select_addedit_input.disabled = true;
			select_addedit_chk.disabled   = true;
		}
		
		if (select_addedit_radio.selected == true)
		{
			select_addedit_input.disabled = false;
			select_addedit_chk.disabled   = false;
		}
	},


	asf_toggleradio_filename: function () {
		var select_addedit_radio_all = document.getElementById("asf-addedit-radio-filename-all");
		var select_addedit_radio = document.getElementById("asf-addedit-radio-filename");
		var select_addedit_input = document.getElementById("asf-addedit-filename");
		var select_addedit_chk = document.getElementById("asf-addedit-filename-regexp");
		
		if (select_addedit_radio_all.selected == true)
		{
			select_addedit_input.disabled = true;
			select_addedit_chk.disabled   = true;
		}
		
		if (select_addedit_radio.selected == true)
		{
			select_addedit_input.disabled = false;
			select_addedit_chk.disabled   = false;
		}
	},


	// add the / at the beginning and the end of the input_regexp if id_regexp id checked
	makeRegexp: function (id_regexp, input_regexp) {
		
		var filter = document.getElementById(input_regexp);
		
		if (document.getElementById(id_regexp).checked) 
		{
			if (filter.value.substring(0,1) != "/")  // let's add the /
			{
				filter.value = "/" + filter.value;
			}
			if (filter.value.substr(filter.value.length - 1, 1) != "/")
			{
				filter.value = filter.value + "/";
			}
		}
		else 
		{
			if (filter.value.substring(0,1) == "/")  // then delete the /
			{
				filter.value = filter.value.substring(1, filter.value.length);
			}
			if (filter.value.substr(filter.value.length - 1, 1) == "/")	
			{
				filter.value = filter.value.substring(0, filter.value.length -1);
			}
		}
		document.getElementById(input_regexp).value = filter.value;
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


	// on text change, check if the text is still regexp, else unchecked the checkbox
	testRegexp: function (id_regexp, input_regexp) {
		var filter = document.getElementById(input_regexp);
		
		if ((filter.value.substring(0,1) != "/") || (filter.value.substr(filter.value.length - 1, 1) != "/")) 
		{
			document.getElementById(id_regexp).checked = false;
		}
	},

	
	trim: function (string)
	{
		return string.replace(/(^\s*)|(\s*$)/g,'');
	},

	
	//
	// ADD new filter in tree
	//
	asf_add: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
	// get the domain
	//
		var domain_radio = document.getElementById('radio-addedit-domain');
		var domain = document.getElementById('asf-addedit-domain');
		var domain_regexp = document.getElementById('asf-addedit-domain-regexp');
		if (domain_radio.value == 0)
		{
			var rule = "/.*/";
		}
		else
		{
			var rule = this.trim(domain.value);
		}
		
		if (rule != "") 
		{
			var domain = rule;
		}
		else
		{
			var err_domain = document.getElementById('popup-nodata-domain').value;
			asfalert = alert;
			//alert(err_domain);
			asfalert("test");
			var error = true;
		}
		
	// get the filename
	//
		var filename_radio = document.getElementById('radio-addedit-filename');
		var filename = document.getElementById('asf-addedit-filename');
		var filename_regexp = document.getElementById('asf-addedit-filename-regexp');
		if (filename_radio.value == 0)
		{
			var rule = "/.*/";
		}
	    else
		{
			var rule = this.trim(filename.value);
		}
		
	   if (rule != "") 
		{
			var filename = rule;
		}
		else
		{
			var err_filename = document.getElementById('popup-nodata-filename').value;
			alert(err_filename);
			var error = true;
		}
		
		
	//get the foldername
	//
		var folder = document.getElementById('asf-addedit-folder');
		   
		var rule = this.trim(folder.value);
		if (rule == "")
		{
			var err_folder = document.getElementById('popup-nodata-folder').value;
			alert(err_folder);
			var error = true;
		}
		else
		{
			var folder = rule;
		}		
			
			
			
		if (error != true)
		{
			// adding into the tree		
			var filter = window.opener.document.getElementById('asf-filterList');
			var rules = window.opener.document.getElementById('asf-filterChilds');
			var item = window.opener.document.createElement('treeitem');
			var row = window.opener.document.createElement('treerow');
			var c1 = window.opener.document.createElement('treecell');
			var c2 = window.opener.document.createElement('treecell');  
			var c3 = window.opener.document.createElement('treecell');
			var c4 = window.opener.document.createElement('treecell');
			c1.setAttribute('label', domain);
			c2.setAttribute('label', filename);
			c3.setAttribute('label', folder);
			c4.setAttribute('value', true);
			c1.setAttribute('editable', false);
			c2.setAttribute('editable', false);
			c3.setAttribute('editable', false);
			row.appendChild(c1);
			row.appendChild(c2);
			row.appendChild(c3);
			row.appendChild(c4);
			item.appendChild(row);
			rules.appendChild(item);
			
			//select the new filter	
			idx = rules.childNodes.length-1; 
			filter.view.selection.select(idx);
			filter.boxObject.ensureRowIsVisible(idx);
		 
			filter.focus();
			window.close();
			
			//autosave when adding a filter
			if (instantApply)
			{
				//save the filters
				window.opener.automatic_save_folder.asf_savefilters();
			}
		}
	},


	asf_edit: function () {
		var instantApply = this.prefManager.getBoolPref("browser.preferences.instantApply");
	// get the domain
	// 
		var domain_radio = document.getElementById('radio-addedit-domain');
		var domain = document.getElementById('asf-addedit-domain');
		var domain_regexp = document.getElementById('asf-addedit-domain-regexp');
		if (domain_radio.value == 0)
		{
			var rule = "/.*/";
		}
		else
		{
			var rule = this.trim(domain.value);
		}
		
		if (rule != "") 
		{
			var domain = rule;
		}
		else
		{
			var err_domain = document.getElementById('popup-nodata-domain').value;
			alert(err_domain);
			var error = true;
		}
		
	// get the filename
	// 
		var filename_radio = document.getElementById('radio-addedit-filename');
		var filename = document.getElementById('asf-addedit-filename');
		var filename_regexp = document.getElementById('asf-addedit-filename-regexp');
		if (filename_radio.value == 0)
		{
			var rule = "/.*/";
		}
		else
		{
			var rule = this.trim(filename.value);
		}
		
		if (rule != "") 
		{
			var filename = rule;
		}
		else
		{
			var err_filename = document.getElementById('popup-nodata-filename').value;
			alert(err_filename);
			var error = true;
		}
		
		
	//get the foldername
	//
		var folder = document.getElementById('asf-addedit-folder');
		
		var rule = this.trim(folder.value);
		if (rule == "")
		{
			var err_folder = document.getElementById('popup-nodata-folder').value;
			alert(err_folder);
			var error = true;
		}
		else
		{
			var folder = rule;
		}
		
		if (error != true)
		{		
			var tree = window.opener.document.getElementById("asf-filterList") ;
			var idx = tree.currentIndex;
			if (idx < 0) {
				return;
			}
			
			
			var theValue = tree.treeBoxObject.view.getItemAtIndex(idx);
			var test = theValue.firstChild.childNodes[0].getAttribute("label");
			
			theValue.firstChild.childNodes[0].setAttribute("label", domain );
			theValue.firstChild.childNodes[1].setAttribute("label", filename );
			theValue.firstChild.childNodes[2].setAttribute("label", folder );
			
			//select the edited filter	
			tree.view.selection.select(idx);
			tree.boxObject.ensureRowIsVisible(idx);
			
			tree.focus();
			window.close();
			
			//autosave when editing a filter
			if (instantApply)
			{
			//save the filters
				window.opener.automatic_save_folder.asf_savefilters();
			}
		}
	}
};