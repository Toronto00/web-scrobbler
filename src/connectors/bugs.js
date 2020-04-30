'use strict';

Connector.playerSelector = '.ctl';

Connector.artistSelector = '#newPlayerArtistName';

Connector.trackSelector = '.tracktitle > a';

Connector.getAlbum = () => {
	return Util.getAttrFromSelectors('.albumtitle', 'title');
};

Connector.currentTimeSelector = '.start';

Connector.durationSelector = '.finish';

Connector.pauseButtonSelector = '.btnStop';

Connector.trackArtSelector = '.thumbnail img';
