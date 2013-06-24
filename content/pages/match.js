'use strict';
/**
 * match.js
 * utilities on match page
 * @author taised, Jestar
 */
////////////////////////////////////////////////////////////////////////////////
Foxtrick.Pages.Match = {
	getHomeTeamId: function(doc) {
		if (this.hasNewRatings(doc)) {
			var body = doc.getElementById('mainBody');
			var teams = body.querySelectorAll('h1 > a, h1 > span > a');
			var homeIdx = Foxtrick.util.layout.isRtl(doc) ? 1 : 0;
			var link = teams[homeIdx];
		}
		else {
			var table = this.getRatingsTable(doc);
			var link = table.rows[0].cells[1].getElementsByTagName('a')[0];
		}
		return Foxtrick.util.id.getTeamIdFromUrl(link.href);
	},
	getAwayTeamId: function(doc) {
		if (this.hasNewRatings(doc)) {
			var body = doc.getElementById('mainBody');
			var teams = body.querySelectorAll('h1 > a, h1 > span > a');
			var awayIdx = Foxtrick.util.layout.isRtl(doc) ? 0 : 1;
			var link = teams[awayIdx];
		}
		else {
			var table = this.getRatingsTable(doc);
			var link = table.rows[0].cells[2].getElementsByTagName('a')[0];
		}
		return Foxtrick.util.id.getTeamIdFromUrl(link.href);
	},
	getHomeTeamName: function(doc) {
		if (this.hasNewRatings(doc)) {
			var body = doc.getElementById('mainBody');
			var teams = body.querySelectorAll('h1 > a, h1 > span > a');
			var homeIdx = Foxtrick.util.layout.isRtl(doc) ? 1 : 0;
			var link = teams[homeIdx];
		}
		else {
			var table = this.getRatingsTable(doc);
			var link = table.rows[0].cells[1].getElementsByTagName('a')[0];
		}
		return link.textContent;
	},
	getAwayTeamName: function(doc) {
		if (this.hasNewRatings(doc)) {
			var body = doc.getElementById('mainBody');
			var teams = body.querySelectorAll('h1 > a, h1 > span > a');
			var awayIdx = Foxtrick.util.layout.isRtl(doc) ? 0 : 1;
			var link = teams[awayIdx];
		}
		else {
			var table = this.getRatingsTable(doc);
			var link = table.rows[0].cells[2].getElementsByTagName('a')[0];
		}
		return link.textContent;
	},
	isPrematch: function(doc) {
		return (doc.getElementById('ctl00_ctl00_CPContent_CPMain_pnlPreMatch') != null);
	},
	getSourceSystem: function(doc) {
		var SourceSystem = 'Hattrick';
		var isYouth = this.isYouth(doc);
		var isHTOIntegrated = this.isHTOIntegrated(doc);
		if (isYouth)
			SourceSystem = 'Youth';
		if (isHTOIntegrated)
			SourceSystem = 'HTOIntegrated';
		return SourceSystem;
	},
	isYouth: function(doc) {
		return (doc.location.search.search(/isYouth=true|SourceSystem=Youth/i) > -1);
	},
	isHTOIntegrated: function(doc) {
		return (doc.location.search.search(/SourceSystem=HTOIntegrated/i) > -1);
	},
	isNT: function(doc) {
		return this.getHomeTeamId(doc) < 10000 && this.getAwayTeamId(doc) < 10000;
	},
	hasNewRatings: function(doc) {
		return (doc.getElementById('divReport') != null);
	},

	getId: function(doc) {
		try {
			return (doc.location.search.match(/matchID=(\d+)/i)[1]);
		}
		catch (e) {
			return null;
		}
	},

	inProgress: function(doc) {
		var matchStatus = doc.getElementById('ctl00_ctl00_CPContent_CPMain_lblMatchStatus');
		return (matchStatus != null) && (matchStatus.textContent != '');
	},

	getRatingsTable: function(doc) {
		try {
			return doc.getElementById('mainBody')
				.getElementsByClassName('mainBox')[0]
				.getElementsByTagName('table')[0];
		}
		catch (e) {
			return null;
		}
	},

	hasIndSetPieces: function(ratingstable) {
		// either iSP level link in that cell or for old matches tactic=no link
		return ratingstable.rows.length > 10
				&& ratingstable.rows[10].cells.length > 1
				&& ratingstable.rows[10].cells[1].getElementsByTagName('a').length > 0;
	},

	isWalkOver: function(ratingstable) {
		try {
			for (var i = 1; i <= 7; i++) {
				for (var j = 1; j <= 2; j++) {
					var value = this.getStatFromCell(ratingstable.rows[i].cells[j]);
					if (value > 0) { // no Walk-over
						return false;
					}
				}
			}
		}
		catch (e) {
			Foxtrick.log(e);
		}
		return true;
	},

	isCorrectLanguage: function(ratingstable) {
		try {
			for (var i = 1; i <= 7; i++) {
				for (var j = 1; j <= 2; j++) {
					var value = this.getStatFromCell(ratingstable.rows[i].cells[j]);
					if (value < 0) { // wrong language
						return false;
					}
				}
			}
		}
		catch (e) {
			Foxtrick.log(e);
		}
		return true;
	},

	getStatFromCell: function(cell) {
		var link = cell.firstChild;
		var baseValue = parseInt(link.href.replace(/.+lt=skill/i, '').replace(/.+ll=/i, '')
		                         .match(/^\d+/), 10) - 1;
		if (baseValue == -1) {
			return 0; // non-existant
		}

		var subLevelValue = 0;

		var lang = FoxtrickPrefs.getString('htLanguage');

		try {
			// remove <a> (baseValue above) and <span> (could be added
			// by HatStatsSeparated in module Ratings
			var nodeCloned = cell.cloneNode(true);
			var toRemove = Foxtrick.filter(function(n) {
					var nn = n.nodeName.toLowerCase();
					return nn == 'a' || nn == 'span';
				}, nodeCloned.childNodes);
			Foxtrick.map(function(n) { nodeCloned.removeChild(n); }, toRemove);
			var subLevel = Foxtrick.trim(nodeCloned.textContent);
			var path = "language/ratingSubLevels/sublevel[@text='" + subLevel + "']";
			subLevelValue = Foxtrick.xml_single_evaluate(Foxtrickl10n.htLanguagesXml[lang], path,
			                                             'value');
			if (!subLevelValue)
				return -1;
		}
		catch (e) {
			Foxtrick.log('getStatFromCell', e, path);
		}

		return baseValue + parseFloat(subLevelValue);
	},

	getTacticsLevelFromCell: function(cell) {
		var basevalue = 0;
		if (cell.firstChild.nodeName == 'A')
			basevalue = parseInt(cell.firstChild.href.replace(/.+lt=skill/i, '')
			                     .replace(/.+ll=/i, '').match(/^\d+/), 10);
		return basevalue;
	},

	getTacticsFromCell: function(cell) {
		var tactics = Foxtrick.trim(cell.textContent);
		var lang = FoxtrickPrefs.getString('htLanguage');

		try {
			var path = "language/tactics/tactic[@value='" + tactics + "']";
			var subLevelValue = Foxtrick.xml_single_evaluate(Foxtrickl10n.htLanguagesXml[lang],
			                                                 path, 'type');
			return subLevelValue || -1;
		}
		catch (e) {
			Foxtrick.log('getTacticsFromCell', e, path);
		}
		return null;
	},
	/* modeled on Foxtrick.addBoxToSidebar
	 * @desc add a box to the sidebar on the right
	 * @param doc - HTML document the content is to be added on
	 * @param title - the title of the box, will create one if inexists
	 * @param content - HTML node of the content
	 * @param prec - precedence of the box, smaller value will be placed higher
	 * @return box to be added to
	 */
	addBoxToSidebar: function(doc, title, content, prec) {
		// class of the box to add
		var boxClass = '';
		var sidebar;
		(sidebar = doc.getElementsByClassName('reportHighlights')[0]) &&
			(boxClass = 'ft-matchSidebarBox');

		if (!sidebar)
			return;

		// destination box
		var dest;

		// existing sidebar boxes
		var existings = sidebar.getElementsByClassName(boxClass + ', .rightHandBoxHeader');
		for (var i = 0; i < existings.length; ++i) {
			var box = existings[i];
			var hdr = box.getElementsByClassName('rightHandBoxHeader')[0].textContent;
			if (hdr == title)
				dest = box; // found destination box
		}
		// create new box if old one doesn't exist
		if (!dest) {
			var dest = doc.createElement('div');
			dest.className = boxClass;
			dest.setAttribute('x-precedence', prec);
			// boxHead
			var boxHead = doc.createElement('h4');
			boxHead.className = 'rightHandBoxHeader';
			dest.appendChild(boxHead);
			boxHead.textContent = title;
			// boxBody
			var boxBody = doc.createElement('div');
			boxBody.className = 'rightHandBoxBody';
			dest.appendChild(boxBody);
			// append content to boxBody
			boxBody.appendChild(content);
			// now we insert the newly created box
			var inserted = false;
			if (existings.length) {
				for (var i = 0; i < existings.length; ++i) {
					// precedence of current box, hattrick boxes are set to 0
					var curPrec = existings[i].hasAttribute('x-precedence')
						? Number(existings[i].getAttribute('x-precedence'))
						: 0;
					if (curPrec > prec) {
						if (i == 0 && curPrec == 0)
							// first to be added and placed before HT boxes. add it on top
							// before possible updatepanel div (eg teampage challenge and mailto)
							sidebar.insertBefore(dest, sidebar.firstChild);
						else
							existings[i].parentNode.insertBefore(dest, existings[i]);
						inserted = true;
						break;
					}
				}
			}
			else if (prec < 0) {
				sidebar.insertBefore(dest, sidebar.firstChild);
				inserted = true;
			}

			if (!inserted)
				sidebar.appendChild(dest);
		}

		// finally we add the content
		dest.getElementsByClassName('rightHandBoxBody')[0].appendChild(content);

		return dest;
	},
	modPlayerDiv: function(playerId, func, links) {
		var link = Foxtrick.filter(function(link) {
			return new RegExp(playerId).test(link.href);
		}, links)[0];
		if (link && typeof(func) == 'function')
			func(link.parentNode.parentNode);
	},
	parsePlayerScript: function(doc) {
		var scripts = doc.getElementsByTagName('script');
		var regex = /ht\.matchAnalysis\.playerData\s*=\s*'([\s\S]+?)';/m;
		var playerData;
		for (var i = 0; i < scripts.length; i++) {
			if (regex.test(scripts[i].textContent)) {
				var json = regex.exec(scripts[i].textContent)[1];
				json = json.replace(/\\"(.*?)\\"(?=[:,}])/g, '"$1"');
				try {
					playerData = JSON.parse(json);
				}
				catch (e) {
					Foxtrick.log('FAILED to parse player JSON', e);
					return null;
				}
				break;
			}
		}
		return playerData;
	}
};