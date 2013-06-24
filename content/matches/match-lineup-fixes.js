'use strict';
/**
 * match-lineup-fixes.js
 * Fixes for the new style match lineup
 * @author LA-MJ
 */

Foxtrick.modules['MatchLineupFixes'] = {
	MODULE_CATEGORY: Foxtrick.moduleCategories.MATCHES,
	PAGES: ['match'],
	OPTIONS: [
		'FixWeatherSEs', 'AddStarsToSubs', 'FixMultipleEvents', 'AddLinksInOrders'
	],
	//CSS: Foxtrick.InternalPath + 'resources/css/match-lineup-fixes.css',
	run: function(doc) {

		// START PREPARATION STAGE

		// this is where we fix HTs shit
		// we need to traverse the hidden input fields in the timeline
		// that are used as data sources by HTs to assemble the field on each click.
		// first, each minute/event has input.hidden[id$="_time"][value="min.sec"]
		var timeline = Foxtrick.map(function(el) {
			var time = el.value;
			return { min: Number(time.match(/^\d+/)), sec: Number(time.match(/\d+$/)) };
		}, doc.querySelectorAll('input[id$="_time"]'));

		//doc.querySelectorAll('input[id$="_playerRatings'"]);
		// each minute has input.hidden[id$="_playerRatingsHome"][value="jsonArray"]
		// where jsonArray is an array of Player objects
		// Player = {
		//	Cards: 0,
		//	FromMin: -1,
		//	InjuryLevel: 0,
		//	IsCaptain: false,
		//	IsKicker: false,
		//	PlayerId: 360991810,
		//	PositionBehaviour: 0,
		//	PositionID: 100,
		//	Stamina: 1,
		//	Stars: 3,
		//	ToMin: 90,
		//};

		var initTeamRatings = function(isHome) {
			var playerRatings = doc.querySelectorAll('input[id$="_playerRatings' +
													 (isHome ? 'Home' : 'Away') + '"]');
			var playerRatingsByEvent = Foxtrick.map(function(ratings) {
				return { players: JSON.parse(ratings.value), source: ratings };
			}, playerRatings);
			// keep playerRatingsByEvent[i].source as a pointer to the input
			// so that we know where to save
			return playerRatingsByEvent;
		};
		var playerRatingsHome = initTeamRatings(true);
		var playerRatingsAway = initTeamRatings(false);

		var saveRatings = function(playerRatingsByEvent) {
			// save modifications
			for (var i = 0; i < playerRatingsByEvent.length; ++i) {
				playerRatingsByEvent[i].source.value = JSON.stringify(playerRatingsByEvent[i].players);
			}
		};

		/**
		 * Rewind player ratings to an earlier timeline index
		 * @param	{Array}		playerRatingsByEvent	an array of playerRatings arrays to change
		 * @param	{Integer}	eventIdx				event to rewind
		 * @param	{Integer}	sourceIdx				event to rewind to
		 * @param	{[Array]}	attributesToReset		what attributes to actually reset (optional)
		 */
		var rewindRatings = function(playerRatingsByEvent, eventIdx, sourceIdx, attributesToReset) {
			if (typeof (attributesToReset) == 'undefined')
				attributesToReset = [
					'IsCaptain',
					'IsKicker',
					'PositionBehaviour',
					'PositionID',
					'Stars',
					// stamina is not position dependent + it changes in time
				];
			var players = playerRatingsByEvent[eventIdx].players;
			var correctPlayers = playerRatingsByEvent[sourceIdx].players;
			for (var l = 0; l < players.length; l++) {
				for (var m = 0, attr; attr = attributesToReset[m]; m++) {
					players[l][attr] = correctPlayers[l][attr];
				}
			}
		};

		// more stuff in each event:
		//doc.querySelectorAll('input[id$="_matchEventTypeId"]')
		// leaves field events: 91-97; not 94; 350-352; 512-514
		// other player movement events: 360-262; 370-372;

		//doc.querySelectorAll('input[id$="_eventIndex"]') points to the report tab!
		var eventIndices = doc.querySelectorAll('input[id$="_eventIndex"]');
		var eventIndexByEvent = [];
		for (var i = 0; i < eventIndices.length; i++) {
			eventIndexByEvent.push({ eventIdx: Number(eventIndices[i].value), idx: i });
		}

		//doc.querySelectorAll('input[id$="_timelineEventType"]')
		var TIMELINE_EVENT_TYPES = {
			YELLOW_CARD: 6,
			SECOND_YELLOW_CARD: 7, 	// bug? unused!
			RED_CARD: 8,			// also second yellow now
			GOAL: 9,
			SUB: 10, 				// also swap right now
			NEW_BEHAVIOR: 11,
			SWAP: 12, 				// bug? unused!
			MINUTE: 14,
			PULLBACK: 15,
			CONFUSION: 16,
			INJURY: 18,
			BRUISED: 19,
			NERVES: 20,
			RAIN: 21,
			SUN: 22,
		};
		var subEventTypes = [
			TIMELINE_EVENT_TYPES.SUB,
			TIMELINE_EVENT_TYPES.NEW_BEHAVIOR,
			TIMELINE_EVENT_TYPES.SWAP // TODO: currently not in use!
		];
		var redCardEventTypes = [
			TIMELINE_EVENT_TYPES.SECOND_YELLOW_CARD, // TODO: currently not in use!
			TIMELINE_EVENT_TYPES.RED_CARD,
		];
		var lineupEventTypes = Foxtrick.union(redCardEventTypes, subEventTypes);

		var weatherEventTypes = [
			TIMELINE_EVENT_TYPES.RAIN,
			TIMELINE_EVENT_TYPES.SUN,
		];

		var timelineEvents = doc.querySelectorAll('input[id$="_timelineEventType"]');
		var tEventTypeByEvent = [];
		for (var i = 0; i < timelineEvents.length; i++) {
			tEventTypeByEvent.push({ type: Number(timelineEvents[i].value), idx: i });
		}

		var lineupEvents = Foxtrick.filter(function(event) {
			return Foxtrick.member(event.type, lineupEventTypes);
		}, tEventTypeByEvent);

		var weatherEvents = Foxtrick.filter(function(event) {
			return Foxtrick.member(event.type, weatherEventTypes);
		}, tEventTypeByEvent);

		// info for CHPP
		var SourceSystem = Foxtrick.Pages.Match.getSourceSystem(doc);
		var matchId = Foxtrick.Pages.Match.getId(doc);
		// add locale as argument to prevent using old cache after
		// language changed
		var locale = FoxtrickPrefs.getString('htLanguage');
		var detailsArgs = [
			['file', 'matchdetails'],
			['matchEvents', 'true'],
			['matchID', matchId],
			['SourceSystem', SourceSystem],
			['version', '2.3'],
			['lang', locale]
		];


		// END PREPARATION STAGE



		// here comes the actual stuff

		// weather events don't have the player name in the timeline
		var fixWeatherSEs = function() {
			Foxtrick.util.api.retrieve(doc, detailsArgs, { cache_lifetime: 'session' },
			  function(xml) {
				var events = xml.getElementsByTagName('Event');
				Foxtrick.map(function(evt) {
					var evtMarkup = evt.getElementsByTagName('EventText')[0]
						.textContent.replace(RegExp('<br\\s*/?>', 'g'), '');
					var evtType = evt.getElementsByTagName('EventTypeID')[0]
						.textContent;

					if (evtType > 300 && evtType < 310) {
						// whether events
						var temp = doc.createElement('div');
						Foxtrick.util.sanitize.addHTML(doc, evtMarkup, temp);
						// trusted source
						var link = temp.getElementsByTagName('a')[0];
						// let's inject a hidden row into
						// match highlights table (report tab)
						var table = doc.querySelector('table.tblHighlights');
						var row = table.insertRow(-1);
						Foxtrick.addClass(row, 'hidden');
						var cell = row.insertCell(-1);
						/*
						 * here is the relevant snippet from HT code:
						className = ht.timeline.getEventTypeHighlightClass(type);
						eventControlSelector = "." + className + "#matchEventIndex_" + eventIndex
						eventControl = ht.$(eventControlSelector);
						 * getEventTypeHighlightClass returns undefined for weather SEs
						 * so we need to fake this cell accordingly to be picked up by HTs ;)
						 */
						cell.id = 'matchEventIndex_' +
							evt.attributes.getNamedItem('Index').textContent;
						Foxtrick.addClass(cell, 'undefined');
						cell.appendChild(link);
					}
				}, events);
			});
		};

		// add stars for players that leave the field
		var addStarsToSubs = function(playerRatingsByEvent) {
			// filter players that have not played: { FromMin: 0, ToMin: 0 }
			// these have
			var played = [];
			for (var i = 0; i < playerRatingsByEvent[0].players.length; ++i) {
				var player = playerRatingsByEvent[0].players[i];
				if (!(player.FromMin == 0 && player.ToMin == 0)) {
					player.ftIdx = i; // saving the index in the original array
					played.push(player);
				}
			}
			// WARNING: those are object references, not clones, modify with care!
			// perhaps we should clone instead?

			// let's make some player groups

			// players who play till the end: { ToMin: LastMinuteInTheGame }
			// these don't
			var leavesField = Foxtrick.filter(function(player) {
				return player.ToMin != timeline[timeline.length - 1].min;
			}, played);

			//// players who start the game: { FromMin: -1}
			//// these don't
			//var entersField = Foxtrick.filter(function(player) {
			//	return player.FromMin != -1;
			//}, played);
			//
			// these players both entersField and leavesField later
			//var comesAndGoes = Foxtrick.intersect(leavesField, entersField);
			//
			// some exlusive groups
			//var leavesFieldOnly = Foxtrick.filter(function(player) {
			//	return !Foxtrick.member(player, comesAndGoes);
			//}, leavesField);
			//var entersFieldOnly = Foxtrick.filter(function(player) {
			//	return !Foxtrick.member(player, comesAndGoes);
			//}, entersField);

			for (var i = 0; i < leavesField.length; ++i) {
				var player = leavesField[i];
				var subMin = player.ToMin;
				var idx = player.ftIdx;
				// index in the original players array

				// there are multiple events per minute
				// so we need to find the correct substitution event first
				// players on the bench: { Stars: -1 }
				for (var j = 0; j < timeline.length; ++j) {
					if (timeline[j].min == subMin) {
						// reached the sub minute
						while (playerRatingsByEvent[j].players[idx].Stars != -1)
							++j;
						// reached the sub second because stars = -1

						var starsLast = playerRatingsByEvent[j - 1].players[idx].Stars;
						var subSec = timeline[j].sec;
						// save stamina for later?
						// player.ftLastStamina = ratings.players[idx].Stamina;

						// add stars for all further events
						while (timeline[j]) {
							playerRatingsByEvent[j].players[idx].Stars = starsLast;
							++j;
						}
						// add stars for all events at the same second only
						//while (timeline[j].min == subMin && timeline[j].sec == subSec) {
						//	playerRatingsByEvent[j].players[idx].Stars = starsLast;
						//	++j;
						//}

						// timeline parsed: let's have a break =)
						break;
					}
				}
			}

			saveRatings(playerRatingsByEvent);
		};


		var undoPreviousEvents = function() {

			for (var i = 0; i < lineupEvents.length; i++) {
				var idx = lineupEvents[i].idx;
				var j = idx;
				// trace back and search for events at the same time
				var eventMin = timeline[j].min;
				var eventSec = timeline[j].sec;
				var found = false;
				--j;
				while (j > -1 && timeline[j].min == eventMin && timeline[j].sec == eventSec) {
					if (Foxtrick.member(tEventTypeByEvent[j].type, lineupEventTypes))
						// multiple lineup events happen at the same time
						// will be fixed in fixMulipleSubs()
						break;
					found = true;
					--j;
				}
				if (j < 0 || !found)
					continue;

				// j now points to an event before these events
				// while idx is still our lineup event
				// let's go forward and reset players one event at a time
				for (var k = j + 1; k < idx ; k++) {
					rewindRatings(playerRatingsHome, k, j);
					rewindRatings(playerRatingsAway, k, j);
				}
			}
			saveRatings(playerRatingsHome);
			saveRatings(playerRatingsAway);
		};

		// this will fix red carded players going for the bench straight away
		// red card subs don't need fixing
		var undoRedCards = function() {
			var redCardEvents = Foxtrick.filter(function(event) {
				return Foxtrick.member(event.type, redCardEventTypes);
			}, tEventTypeByEvent);
			if (!redCardEvents.length)
				return;

			for (var i = 0; i < redCardEvents.length; i++) {
				var idx = redCardEvents[i].idx;
				var j = idx - 1;
				if (j < 0)
					continue;

				// j now points to an event before the red card
				// while idx is still our red card event
				// let's reset players
				rewindRatings(playerRatingsHome, idx, j);
				rewindRatings(playerRatingsAway, idx, j);
			}
			saveRatings(playerRatingsHome);
			saveRatings(playerRatingsAway);
		};

		// unfortunately there is not enough info available
		// to parse multiple subs that happen at the same time
		// so we will have to use chpp
		var fixMultipleSubs = function() {
			var subEvents = Foxtrick.filter(function(event) {
				return Foxtrick.member(event.type, subEventTypes);
			}, tEventTypeByEvent);
			if (!subEvents.length)
				return;

			// creating an object to store subs by time
			// e.g. { '1347': [ sub1, sub2, ... ] }
			// where '1347' is event time
			// and subN is { idx: timelineIndex, isHome: boolean }
			var subTimes = {};
			var multiple = false;
			for (var i = 0; i < subEvents.length; i++) {
				var idx = subEvents[i].idx;

				var matchEventIdx = eventIndexByEvent[idx].eventIdx;
				var eventDesc = doc.querySelector('#matchEventIndex_' +
												  matchEventIdx);
				// points to report tab
				if (!eventDesc)
					continue;
				var isHomeEvent;
				if (Foxtrick.hasClass(eventDesc, 'highlightHome'))
					isHomeEvent = true;
				else if (Foxtrick.hasClass(eventDesc, 'highlightAway'))
					isHomeEvent = false;
				else
					continue;

				var eventMin = timeline[idx].min;
				var eventSec = timeline[idx].sec;
				var eventTime = Number(eventMin) * 100 + Number(eventSec);

				if (!subTimes.hasOwnProperty(eventTime)) {
					// first sub for this time
					subTimes[eventTime] = [];
				}
				else
					// we had this time before
					multiple = true;

				subTimes[eventTime].push({
					idx: idx, isHome: isHomeEvent
				});
			}
			if (!multiple)
				return;

			// now we ditch the time and create just an array of subgroups
			// each group has subs happening at the same sec
			// we still keep single subs because they are later used
			// to bind correct xml to multiple subs
			var subGroups = [], time;
			for (time in subTimes) {
				subGroups.push(subTimes[time]);
			}
			// OK, so at this point in subGroups
			// we have groups of subs that happen at the same time

			// in HTO matches playerRatingsHome[i].players[j].PlayerID etc
			// is not the same as the real ID
			// the conversion is handled in HT classes exclusively
			// therefore we'll need some hack-work
			if (SourceSystem == 'HTOIntegrated') {
				var HTOPlayers = Foxtrick.Pages.Match.parsePlayerScript(doc);
				if (!HTOPlayers) {
					Foxtrick.log('MatchLineupFixes: failed to fetch HTO info from the script tag');
					return;
				}
			}

			Foxtrick.util.api.retrieve(doc, detailsArgs, { cache_lifetime: 'session' },
			  function(xml) {
				var homeId = xml.getElementsByTagName('HomeTeamID')[0].textContent;
				var awayId = xml.getElementsByTagName('AwayTeamID')[0].textContent;

				var homeArgs = [
					['file', 'matchlineup'],
					['matchID', matchId],
					['teamID', homeId],
					['SourceSystem', SourceSystem],
					['version', '1.8']
				];
				var awayArgs = [
					['file', 'matchlineup'],
					['matchID', matchId],
					['teamID', awayId],
					['SourceSystem', SourceSystem],
					['version', '1.8']
				];

				Foxtrick.util.api.retrieve(doc, homeArgs, { cache_lifetime: 'session' },
				  function(homeXml) {
					Foxtrick.util.api.retrieve(doc, awayArgs, { cache_lifetime: 'session' },
					  function(awayXml) {
						/**
						 * add <Substitution> xml (home or away) to appropriate events
						 * @param	{Array}		subEvents	an array of sub objects
						 * @param	{Array}		xmlSubs		an array of <substitution> xmls
						 * @param	{Integer}	offset		offset to skip previously bound xml
						 */
						var bindXmlToEvents = function(subEvents, xmlSubs, offset) {
							for (var i = 0; i < subEvents.length; i++) {
								subEvents[i].xml = xmlSubs[i + offset];
							}
						};

						/**
						 * replace SbjPId & ObjPId in sub.xml with HTO IDs
						 * HTO IDs are used in the timeline/ratings for HTO matches
						 * @param	{Array}		subGroup	array of sub objects
						 * @returns	{Boolean}				whether successful or not
						 */
						var addHTOIds = function(subGroup) {
							var findPId = function(sourceId) {
								for (var i = 0; i < HTOPlayers.length; i++) {
									if (HTOPlayers[i].SourcePlayerId == sourceId)
										return HTOPlayers[i].PlayerId;
								}
								return null;
							};
							for (var j = 0; j < subGroup.length; j++) {
								var subXml = subGroup[j].xml;

								var sbjIdEl = subXml.getElementsByTagName('SubjectPlayerID')[0];
								var sbjId = sbjIdEl.textContent;
								var realSbjId = findPId(sbjId);

								var objIdEl = subXml.getElementsByTagName('ObjectPlayerID')[0];
								var objId = objIdEl.textContent;
								var realObjId;
								// in case sbjPlayer leaves without sub
								// XML: objId = 0, newPosId = 0, newPosBeh = -1
								// @ref matchId: 394945951 teamId: 3110
								if (objId == 0) {
									realObjId = 0;
								}
								else
									realObjId = findPId(objId);

								if (realSbjId === null || realObjId === null)
									return false;
								sbjIdEl.textContent = realSbjId;
								objIdEl.textContent = realObjId;
							}
							return true;
						};

						// we really can't tell
						// how many stars the players have
						// in the middle steps
						// unless the position/behaviour is the same
						// as after all subs have happened
						var setStarsIfKnown = function(player, finalRatings) {
							if (player.PositionID != -1) {
								player.Stars = -1;
								var finalPlayer = Foxtrick.filter(function(p) {
									return p.PlayerId == player.PlayerId;
								}, finalRatings.players)[0];
								if (player.PositionID == finalPlayer.PositionID &&
									player.PositionBehaviour ==
										finalPlayer.PositionBehaviour)
									player.Stars = finalPlayer.Stars;
							}
						};

						var events = xml.getElementsByTagName('Event');
						var homeSubsXml = homeXml.getElementsByTagName('Substitution');
						var awaySubsXml = awayXml.getElementsByTagName('Substitution');
						// use two indices as offsets to bind correct xml
						var homeSubsCt = 0;
						var awaySubsCt = 0;

						for (var i = 0; i < subGroups.length; i++) {
							var subGroup = subGroups[i];
							// divide the subs in subGroup by home/away
							var homeSubsInGroup = [];
							var awaySubsInGroup = [];
							for (var j = 0; j < subGroup.length; j++) {
								var sub = subGroup[j];
								if (sub.isHome)
									homeSubsInGroup.push(sub);
								else
									awaySubsInGroup.push(sub);
							}
							// bind the xml accordingly
							bindXmlToEvents(homeSubsInGroup, homeSubsXml, homeSubsCt);
							bindXmlToEvents(awaySubsInGroup, awaySubsXml, awaySubsCt);
							// update the offsets so that already used xml is skipped later
							homeSubsCt += homeSubsInGroup.length;
							awaySubsCt += awaySubsInGroup.length;
							if (subGroup.length == 1)
								// we don't care about single subs any more
								// they served their purpose as offsets
								continue;
							if (SourceSystem == 'HTOIntegrated' && !addHTOIds(subGroup)) {
								// we can't do anything without HTOIds
								Foxtrick.log('MatchLineupFixes: failed to add HTO IDs');
								return;
							}

							// OK, we assume everything's OK now.
							// Let's go through subs one by one and fix each one except the last
							for (var j = 0; j < subGroup.length - 1; j++) {
								var sub = subGroup[j];
								var ratingsData = (sub.isHome) ? playerRatingsHome :
									playerRatingsAway;
								var ratings = ratingsData[sub.idx];

								// ratings at last event
								// used for setStarsIfKnown
								var finalIdx = subGroup[subGroup.length - 1].idx;
								var finalRatings = ratingsData[finalIdx];

								// rewind to the event before this one
								// since we go through subs one by one
								// this will update the current iteration
								// with previous changes (if any)
								var goodIdx = sub.idx - 1;
								rewindRatings(ratingsData, sub.idx, goodIdx);

								// get the relevant players and apply sub
								var sbjId = sub.xml
									.getElementsByTagName('SubjectPlayerID')[0].textContent;
								var objId = sub.xml
									.getElementsByTagName('ObjectPlayerID')[0].textContent;
								var sbjPlayer = Foxtrick.filter(function(p) {
									return p.PlayerId == sbjId;
								}, ratings.players)[0];
								var objPlayer = Foxtrick.filter(function(p) {
									return p.PlayerId == objId;
								}, ratings.players)[0];
								// in case sbjPlayer leaves without sub
								// XML: objId = 0, newPosId = 0, newPosBeh = -1
								// @ref matchId: 394945951 teamId: 3110
								// this means objPlayer is null
								if (objPlayer === null) {
									sbjPlayer.PositionID = -1;
								}
								else {
									var orderType = Number(sub.xml
										.getElementsByTagName('OrderType')[0].textContent);
									var targetPlayer = objPlayer, sourcePlayer = sbjPlayer;
									if (orderType == 3) {
										// for some weird reason NewPositionId
										// is applied to sbjPlayer in swaps
										targetPlayer = sbjPlayer;
										sourcePlayer = objPlayer;
									}
									sourcePlayer.PositionBehaviour = targetPlayer.PositionBehaviour;
									sourcePlayer.PositionID = targetPlayer.PositionID;
									targetPlayer.PositionBehaviour = Number(sub.xml
										.getElementsByTagName('NewPositionBehaviour')[0].textContent);
									targetPlayer.PositionID = Number(sub.xml
										.getElementsByTagName('NewPositionId')[0].textContent);

									setStarsIfKnown(sbjPlayer, finalRatings);
									setStarsIfKnown(objPlayer, finalRatings);
								}
							}
						}

						// don't forget to save, dumbo!
						saveRatings(playerRatingsHome);
						saveRatings(playerRatingsAway);
					});
				});
			});
		};
		// there's only plaintext in orders tab
		// let's add links
		var addLinksInOrders = function() {
			var ordersTable = doc.querySelector('#ListPlayerOrders table');
			if (!ordersTable)
				return;

			var playerData = Foxtrick.Pages.Match.parsePlayerScript(doc);

			if (!playerData.length) {
				Foxtrick.log('addLinksInOrders: failed to parse playerData');
				return;
			}

			var html = ordersTable.innerHTML;
			for (var i = 0; i < playerData.length; i++) {
				var p = playerData[i];
				var fullName = p.FirstName + (p.NickName ? " '" + p.NickName + "' " : ' ') +
					p.LastName;
				var link = '<a id="playerLink" href="/Club/Players/Player.aspx?PlayerId=' +
					p.SourcePlayerId + '">' + fullName + '</a>';
				// use negative lookahead in case HTs actually shape up
				html = html.replace(new RegExp(fullName + '(?!</a>)', 'g'), link);
			}
			ordersTable.innerHTML = html;
		};



		// DO STUFF
		if (Foxtrick.Pages.Match.isPrematch(doc)
			|| Foxtrick.Pages.Match.inProgress(doc))
			return;

		if (!Foxtrick.Pages.Match.hasNewRatings(doc))
			return;

		if (Foxtrick.Pages.Match.isWalkOver(doc.querySelector('div.mainBox table')))
			return;

		if (FoxtrickPrefs.isModuleOptionEnabled('MatchLineupFixes', 'AddLinksInOrders'))
			addLinksInOrders();

		if (weatherEvents.length &&
			FoxtrickPrefs.isModuleOptionEnabled('MatchLineupFixes', 'FixWeatherSEs'))
			fixWeatherSEs();

		if (!playerRatingsHome[0].players[0].hasOwnProperty('ftIdx') && // FF is executing twice, wtf?
			FoxtrickPrefs.isModuleOptionEnabled('MatchLineupFixes', 'AddStarsToSubs')) {
			addStarsToSubs(playerRatingsHome);
			addStarsToSubs(playerRatingsAway);
		}
		if (lineupEvents.length &&
			FoxtrickPrefs.isModuleOptionEnabled('MatchLineupFixes', 'FixMultipleEvents')) {
			undoPreviousEvents();
			undoRedCards();
			fixMultipleSubs();
			// we should be good now unless something weird happens
			// e.g. red card that _follows_ a sub (same second, obviously)
		}

	},
};