const fetchDb = await fetch(
	"https://api.dreimetadaten.de/db.json?sql=SELECT%0D%0A++h%C3%B6rspielID%2C%0D%0A++idAppleMusic%2C%0D%0A++idSpotify%0D%0AFROM%0D%0A++h%C3%B6rspiel%0D%0AWHERE%0D%0A++h%C3%B6rspielID+IN+%28%0D%0A++++SELECT+h%C3%B6rspielID+FROM+serie%0D%0A++++UNION%0D%0A++++SELECT+h%C3%B6rspielID+FROM+spezial%0D%0A++++UNION%0D%0A++++SELECT+h%C3%B6rspielID+FROM+kurzgeschichten%0D%0A++%29%0D%0A++AND+idAppleMusic+IS+NOT+NULL%0D%0A++AND+idSpotify+IS+NOT+NULL%0D%0ALIMIT+10%3B",
);

// https://api.dreimetadaten.de/db.json?sql=SELECT%0D%0A++h%C3%B6rspielID%2C%0D%0A++idAppleMusic%2C%0D%0A++idSpotify%0D%0AFROM%0D%0A++h%C3%B6rspiel%0D%0AWHERE%0D%0A++h%C3%B6rspielID+IN+%28%0D%0A++++SELECT+h%C3%B6rspielID+FROM+serie%0D%0A++++UNION%0D%0A++++SELECT+h%C3%B6rspielID+FROM+spezial%0D%0A++++UNION%0D%0A++++SELECT+h%C3%B6rspielID+FROM+kurzgeschichten%0D%0A++%29%0D%0A++AND+idAppleMusic+IS+NOT+NULL%0D%0A++AND+idSpotify+IS+NOT+NULL%3B

const fetchVer = await fetch(
	"https://api.dreimetadaten.de/db.json?sql=select+major%2C+minor%2C+patch+from+version+order+by+date+desc+limit+1",
);

// 1: apm: https://music.apple.com/de/album/folge-1-und-der-super-papagei/1092529875
// 1: spf: https://open.spotify.com/album/4N9tvSjWfZXx3eHKblYEWQ
const shareInput = "";
// "https://open.spotify.com/album/4N9tvSjWfZXx3eHKblYEWQ";

const apiVer = await fetchVer.json();
const apiDb = await fetchDb.json();

const _cols = ["id", "apm", "spf"];

const data = {
	completions: 2,
	current: {},
	episodes: {
		3: {
			provider: { apm: "1092531572", spf: "61OtrnMm1lqoMgMRb1aw7g" },
			plays: 2,
		},
		1: {
			provider: { apm: "1092529875", spf: "4N9tvSjWfZXx3eHKblYEWQ" },
			plays: 2,
		},
		7: {
			provider: { apm: "1092528550", spf: "3nGyW4ETDrDpInYEAQCyYS" },
			plays: 1,
		},
		4: {
			provider: { apm: "1092538644", spf: "2w902iYtkf0ipmTImyLlsL" },
			plays: 2,
		},
		9: {
			provider: { apm: "1092538040", spf: "0aNqdp5ayuUNsOdUwu8x0b" },
			plays: 1,
		},
		2: {
			provider: { apm: "1092530929", spf: "0xldqK4Ocdt8dwQSxUzt6x" },
			plays: 2,
		},
		5: {
			provider: { apm: "1092528575", spf: "5YWM39RnabpxekZuHriTam" },
			plays: 3,
		},
		8: {
			provider: { apm: "1092538504", spf: "6MRsf5IcfqJIogaNqtESnh" },
			plays: 2,
		},
	},
	version: [2, 8, 11],
};

// main

if (apiVer && apiDb) {
	const version = apiVer.rows[0];
	if (data.version !== version) updateDatabase(version, apiDb.rows);
}
if (shareInput) {
	const selection = shareSelect(shareInput);
	if (selection) {
		data.current.episode = data.episodes[selection];
		data.current.shared = "true";
	} else {
		data.current.shared = "error";
	}
} else {
	data.current.episode = data.episodes[randomSelect()];
	data.current.shared = "false";
}
data.current.url = getUrlfromCurrent(data.current);
checkCompletion();

document.write(JSON.stringify(data));
// console.log(JSON.stringify(data));

// mutating data

function updateDatabase(version, remote) {
	data.episodes = mergeEpisodes(
		data.episodes,
		formatRows(remote, data.completions),
	);
	data.version = version;
}

function randomSelect() {
	const minPlays = getMinPlays(data.episodes);
	const candidates = Object.entries(data.episodes)
		.filter(([, v]) => v.plays === minPlays)
		.map(([id]) => id);

	const selection = candidates[Math.floor(Math.random() * candidates.length)];

	logPlay(selection);
	return selection;
}

function shareSelect(url) {
	const match = getIdFromUrl(url);
	if (!match) return null;
	const { eId, provider } = match;
	if (!eId | !provider) return null;
	if (data.current.platform !== provider) data.current.platform = provider;
	logPlay(eId);
	return eId;
}

function checkCompletion() {
	const postMinPlays = getMinPlays(data.episodes);
	if (postMinPlays > data.completions) {
		data.completions = postMinPlays;
		data.current.completed = "true";
	} else {
		data.current.completed = "false";
	}
}

function logPlay(eId) {
	data.episodes[eId].plays += 1;
}

// utils

function getMinPlays(episodes = {}) {
	const entries = Object.entries(episodes || {});
	if (!entries.length) return null;
	return Math.min(...entries.map(([, v]) => v.plays));
}

function getUrlfromCurrent(current = {}) {
	switch (current.platform) {
		case "spf":
			return `spotify:album:${current.episode.provider.spf}`;

		default:
			return `https://music.apple.com/album/${current.episode.provider.apm}`;
	}
}

function getIdFromUrl(url) {
	if (!url) return null;

	const episodes = data.episodes || {};

	if (url.includes("apple")) {
		const m = url.match(/\/(\d+)(?=$|\?)/);
		if (!m) return null;
		const id = m[1];
		for (const [eId, value] of Object.entries(episodes)) {
			const provider = value?.provider;
			if (provider?.apm && String(provider.apm) === id) {
				return { eId, provider: "apm" };
			}
		}
		return null;
	}

	if (url.includes("spotify")) {
		const m = url.match(/(?:album|track)\/([A-Za-z0-9]+)/);
		if (!m) return null;
		const id = m[1];
		for (const [eId, value] of Object.entries(episodes)) {
			const provider = value?.provider;
			if (provider?.spf && String(provider.spf) === id) {
				return { eId, provider: "spf" };
			}
		}
		return null;
	}

	return null;
}

function mergeEpisodes(oldEpisodes = {}, newEpisodes = {}) {
	const result = Object.keys(newEpisodes).reduce((acc, eId) => {
		const candidate = newEpisodes[eId];
		acc[eId] = oldEpisodes[eId]
			? {
					...candidate,
					plays: oldEpisodes[eId].plays,
					initPlays: oldEpisodes[eId].initPlays || 0,
				}
			: candidate;
		return acc;
	}, {});
	return result;
}

function formatRows(rows, completions = 0) {
	const initialPlays = Math.max(0, completions - 1);
	return rows.reduce((accumulator, currentRow) => {
		const [id, apm, spf] = currentRow;
		accumulator[id] = {
			provider: { apm, spf },
			plays: initialPlays,
			initPlays: initialPlays,
		};
		return accumulator;
	}, {});
}
