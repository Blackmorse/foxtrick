//**********************************************************
/**
* forumsorttable.js
* sorting of HT-ML tables
* @author convinced
*/

var FoxtrickForumSortTable = {

	MODULE_NAME : "ForumSortTable",
	MODULE_CATEGORY : Foxtrick.moduleCategories.FORUM,
	PAGES : new Array('forumViewThread'),
    NEW_AFTER_VERSION: "0.5.2.1",
	LATEST_CHANGE:"Sort option for forum tables",
	LATEST_CHANGE_CATEGORY : Foxtrick.latestChangeCategories.NEW,
	DEFAULT_ENABLED : true,
	CSS: Foxtrick.ResourcePath + "resources/css/forumsorttable.css",
	
	sortNum : false,
	sortYouthSkill : false,
	sortAge : false,
	sortIndex : -1,			
				
	run : function( page, doc ) {
		try {
			var tables = doc.getElementsByClassName("htMlTable");  
		    for (var i = 0; i < tables.length; ++i) {
		    	var ths = tables[i].getElementsByTagName("th");  
				for (var j = 0; j < ths.length; ++j) {
					Foxtrick.addEventListenerChangeSave(ths[j], "click", FoxtrickForumSortTable.clickListener, false);
				}
			}
		}
		catch (e) {
			Foxtrick.dumpError(e);
		}
	},
	
	clickListener : function( ev ) {
		try {
			var this_th = ev.target;
			var table = this_th.parentNode.parentNode.parentNode;
			for (var j = 0; j < table.rows[0].cells.length; ++j) {
				if (table.rows[0].cells[j]===this_th) break;
			}
			var index = j;	
			Foxtrick.dump('index ' + index + '\n');
			
			var is_num = true, is_age=true, is_youthskill = true;;
			for (var i = 1; i < table.rows.length; ++i) {
		    	var inner = Foxtrick.trim(Foxtrick.stripHTML(table.rows[i].cells[index].innerHTML));
				//Foxtrick.dump( (inner!='')+' '+isNaN(parseFloat(inner))+' '+ parseInt(inner)+'\n');	
				if (isNaN(parseFloat(inner)) && inner!='') {is_num=false;} 
		    	if (inner.search(/^(-|\d)\/(-|\d)$/)==-1 && inner!='') {is_youthskill=false;} 
		    	if (inner.search(/^\d+\.\d+$/)==-1 && inner!='') {is_age=false;} 
		    }
			Foxtrick.dump('is_num '+is_num+'\n');
			Foxtrick.dump('is_youthskill '+is_youthskill+'\n');
			Foxtrick.dump('is_age '+is_age+'\n');
			
			// old rows to array
			var table_old = table.cloneNode(true);
			var rows = new Array();
			for (var i = 1; i < table.rows.length; ++i) {
				rows.push(table_old.rows[i].cloneNode(true));
			}
			
			// sort options
			FoxtrickForumSortTable.sortYouthSkill = is_youthskill;
			FoxtrickForumSortTable.sortAge = is_age;
			FoxtrickForumSortTable.sortNum = is_num;
			FoxtrickForumSortTable.sortIndex = index;			
			
			// sort them
			rows.sort(FoxtrickForumSortTable.sortCompare);
			
			// put them back
			for (var i = 1; i < table.rows.length; ++i) {
				table_old.rows[i].innerHTML = rows[i-1].innerHTML;
			}
			table.innerHTML = table_old.innerHTML;

	    	var ths = table.getElementsByTagName("th");  
			for (var j = 0; j < ths.length; ++j) {
				Foxtrick.addEventListenerChangeSave(ths[j], "click", FoxtrickForumSortTable.clickListener, false);
			}
			
		}
		catch (e) {
			Foxtrick.dumpError(e);
		}
	},
	
	sortCompare : function(a, b) {
		var aContent, bContent;
		
		aContent = a.cells[FoxtrickForumSortTable.sortIndex].innerHTML;
		bContent = b.cells[FoxtrickForumSortTable.sortIndex].innerHTML;
	
		if (aContent === bContent) {
			return 0;
		}

		aContent = Foxtrick.stripHTML(aContent);
		bContent = Foxtrick.stripHTML(bContent);

		// place empty cells at the bottom
		if (aContent === "" || aContent === null || aContent === undefined) {
			return 1;
		}
		if (bContent === "" || bContent === null || bContent === undefined) {
			return -1;
		}
		
		if (FoxtrickForumSortTable.sortYouthSkill) {
			aContent = aContent.replace('-','0').match(/^(\d)\/(\d)$/);
			aContent = aContent[1] * 18 + aContent[2] * 2 + (a.cells[FoxtrickForumSortTable.sortIndex].getElementsByTagName('strong').length==0?0:1); 			
			bContent = bContent.replace('-','0').match(/^(\d)\/(\d)$/);
			bContent = bContent[1] * 18 + bContent[2] * 2 + (b.cells[FoxtrickForumSortTable.sortIndex].getElementsByTagName('strong').length==0?0:1); 
			return bContent - aContent;
		}
		else if (FoxtrickForumSortTable.sortAge) {
			aContent = aContent.match(/^(\d+)\.(\d+)$/);
			aContent = parseInt(aContent[1]) * 1000 + parseInt(aContent[2]) ;			
			bContent = bContent.match(/^(\d+)\.(\d+)$/);
			bContent = parseInt(bContent[1]) * 1000 + parseInt(bContent[2]);
			return aContent - bContent;
		}
		else if (FoxtrickForumSortTable.sortNum) {
			aContent = parseFloat(aContent);
			bContent = parseFloat(bContent);
			aContent = isNaN(aContent) ? 0 : aContent;
			bContent = isNaN(bContent) ? 0 : bContent;
			if (aContent === bContent) {
				return 0;
			}			
			else {
				return bContent - aContent;
			}
		}
		else { // sort string
			// always sort by ascending order
			return aContent.localeCompare(bContent);
		}		
	},

};