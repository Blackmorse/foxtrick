/**
 * teamStats.js
 * Foxtrick team overview
 * @author OBarros
 */
////////////////////////////////////////////////////////////////////////////////
var FTTeamStats= {

    MODULE_NAME : "FTTeamStats",
        MODULE_CATEGORY : Foxtrick.moduleCategories.SHORTCUTS_AND_TWEAKS,
        DEFAULT_ENABLED : true,

    init : function() {
            Foxtrick.registerPageHandler( 'players',
                                          FTTeamStats);
    },

    run : function( page, doc ) {
         
        var specs = {};
		var allDivs2 = doc.getElementsByTagName( "div" );
		for( var i = 0; i < allDivs2.length; i++ ) {

			if( allDivs2[i].className == "playerInfo" ) {
				var specc = allDivs2[i];
				if(specc) {
					// specialities
                    var specMatch = specc.textContent.match(/\[\D+\]/g);
                    if (specMatch != null) {
                        var spec = specMatch[0];
                        if (typeof(specs[spec]) == 'undefined') {
                            specs[spec] = 1;
                        } else {
                            specs[spec]++;
                        }
                    }
				}
			}
		}

		var boxrightt=doc.getElementById('sidebar');
		var txt = '';

        var specsTable = "";
        for (var spec in specs) {
          specsTable += "<tr><td class=\"ch\">" + spec.replace(/\[|\]/g,"") + "</td><td>" + specs[spec] + "</td></tr>";
        }

        var transferListed = getElementsByClass( "transferListed", doc );
        var img_lis = '<img style="width: 10px; height: 18px;" ilo-full-src="http://www.hattrick.org/Img/Icons/dollar.gif" src="/Img/Icons/dollar.gif" class="transferListed" title="">';
        if (transferListed.length > 0) {
          specsTable += "<tr><td class=\"ch\">" + img_lis + "</td><td>" + transferListed.length + "</td></tr>";
        }

        var yellow = getElementsByClass( "cardsOne", doc );
        var img_yel = '<img style="width: 8px; height: 12px;" ilo-full-src="http://www.hattrick.org/Img/Icons/yellow_card.gif" src="/Img/Icons/yellow_card.gif" class="cardsOne" title="">';
        if (yellow.length > 0) {
            var yels = 0;
            try {
                for (var j = 0; j < yellow.length; j++) {
                    var head = yellow[j].parentNode;

                    if (head.innerHTML.indexOf('yel', 0) != -1 ) yels += 1;
                }
            }
            catch(e) {
                dump(e);
            }
            if (yels > 0) specsTable += "<tr><td class=\"ch\">" + img_yel + "</td><td>" + yels + "</td></tr>";
        }

        var yellow_2 = getElementsByClass( "cardsTwo", doc );
        var img_yel = '<img style="width: 17px; height: 12px;" ilo-full-src="http://www.hattrick.org/Img/Icons/dual_yellow_card.gif" src="/Img/Icons/dual_yellow_card.gif" class="cardsTwo" title="">';
        if (yellow_2.length > 0) {
          specsTable += "<tr><td class=\"ch\">" + img_yel + "</td><td>" + yellow_2.length + "</td></tr>";
        }

        var red = getElementsByClass( "cardsOne", doc );
        var img_red = '<img style="width: 8px; height: 12px;" ilo-full-src="http://www.hattrick.org/Img/Icons/red_card.gif" src="/Img/Icons/red_card.gif" class="cardsOne" title="">';
        if (red.length > 0) {
            var reds = 0;
            try {
                for (var j = 0; j < red.length; j++) {
                    var head = red[j].parentNode;

                    if (head.innerHTML.indexOf('red', 0) != -1 ) reds += 1;
                }
            }
            catch(e) {
                dump(e);
            }
            if (reds > 0) specsTable += "<tr><td class=\"ch\">" + img_red + "</td><td>" + reds + "</td></tr>";
        }

        var injuries = getElementsByClass( "injuryBruised", doc );
        var img_bru = '<img style="width: 19px; height: 8px;" ilo-full-src="http://www.hattrick.org/Img/Icons/bruised.gif" src="/Img/Icons/bruised.gif" class="injuryBruised" title="">';
        if (injuries.length > 0) {
          specsTable += "<tr><td class=\"ch\">" + img_bru + "</td><td>" + injuries.length + "</td></tr>";
        }

        var injuries = getElementsByClass( "injuryInjured", doc );
        if (injuries) {
            var weeks = 0;
            try {
                for (var j = 0; j < injuries.length; j++) {
                    var head = injuries[j].parentNode;
                    weeks += parseInt(head.innerHTML.substring(head.innerHTML.IndexOf("<span>")+6, 1));
                }
            }
            catch(e) {
                dump(e);
            }
        }
        var img_inj = '<img style="width: 11px; height: 11px;" ilo-full-src="http://www.hattrick.org/Img/Icons/injured.gif" src="/Img/Icons/injured.gif" class="injuryInjured" title="" alt="">';
        if (weeks > 0) specsTable += "<tr><td class=\"ch\">" + img_inj + "</td><td>" + injuries.length +  " (<b>" + weeks + "</b>)" + "</td></tr>";
        if (specsTable != "") txt = '<table class="smallText">' + specsTable + "</table>";

		var contentDiv = boxrightt.innerHTML;

		var NovaVar;

		NovaVar = '<div class="sidebarBox">';
		NovaVar += '<div class="boxHead">';
		NovaVar += '<div class="boxLeft">';
		NovaVar += '<h2 class="">'+ Foxtrickl10n.getString("foxtrick.FTTeamStats.label") + '</h2>';
		NovaVar += '</div>';
		NovaVar += '</div>';
		NovaVar += '<div class="boxBody">';
		if (txt !="") NovaVar += txt;
		NovaVar += '</div>';
		NovaVar += '<div class="boxFooter"><div class="boxLeft">&nbsp;</div>';
		NovaVar += '</div>';
		NovaVar += '</div>';

		if (txt !="") boxrightt.innerHTML = contentDiv + NovaVar;
        },

        change : function( page, doc ) {

        }
};