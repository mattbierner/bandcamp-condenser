const fs = require('fs')
const { promisify } = require('util')

const bandcamp = require('bandcamp-scraper')
const pMap = require('p-map');


const outFile = './out.data'

// Concurrency does not seem to work currently
const tagsConcurrency = 1
const albumConcurrency = 1

// Some of these tags are noisy but we need all the data we can get
const tags = [
    'alternative-vaporwave',
    'ambient-vaporwave',
    'ambientwave',
    'babewave',
    'boguscollective',
    'chillwave',
    'computergaze',
    'doswave',
    'dream-music',
    'dreampunk',
    'eccojams',
    'faux-utopian',
    'florida-ambient',
    'future-funk',
    'glitchwave',
    'glo-fi',
    'hypnagogic-pop',
    'hypnagogic',
    'internet',
    'late-night-lo-fi',
    'mallsoft',
    'non-standard',
    'nu-disco',
    'nuwrld',
    'phaserwave',
    'plunderphonics',
    'post-internet',
    'post-vaporwave',
    'post-xerox',
    'power_lunch',
    'savusavu',
    'seapunk',
    'signalwave',
    'slushwave',
    'tapejams',
    'vaporambient',
    'vaporchill',
    'vaporfunk',
    'vaporglitch',
    'vaporhop',
    'vapornoise',
    'vaporsex',
    'vaporsynth',
    'vaportech',
    'vaportrap',
    'vaporwave',
    'vapour',
    'vhswave',
    'virtual-reality',
    'webpunk',
    'webwave',
    'xerox',
]

const delay = time =>
    new Promise(resolve => setTimeout(resolve, time))


const getAlbum = (url, retry = 3) => 
    promisify(bandcamp.getAlbumInfo)(url).then(x => {
        if (x && x.tracks && x.tracks.length) {
            return x
        }
        if (!retry) {
            return x
        }
        return new Promise(res => setTimeout(res, 2000))
            .then(() => getAlbum(url, retry - 1))
    })

const getAlbumsWithTag = (tag, allAlbums) =>
    new Promise(resolve =>
        (function loop(page, retry = 3) {
            bandcamp.tag({ tag, page }, (error, searchResults) => {
                if (error) {
                    console.error(error)
                    resolve(allAlbums)
                } else if (searchResults.length === 0) {
                    if (!retry) {
                        resolve(allAlbums)
                        return;
                    }
                    setTimeout(() => loop(page, retry - 1), 2000)
                } else {
                    for (const album of searchResults) {
                        allAlbums.set(album.name, album)
                    }
                    console.log(tag + '       found ' + searchResults.length)
                    loop(page + 1)
                }
            })
        }(1)))


const printAlbum = (album) => {
    const tracks = album.tracks.map(track => '- ' + track.name).join('\n')
    return `${album.title}
=====
${album.artist}

${tracks}`
}


const allAlbums = new Map()

pMap(tags, tag => {
    return getAlbumsWithTag(tag, allAlbums)
}, { concurrency: tagsConcurrency })
    .then(() => {
        fs.writeFileSync('albums', JSON.stringify(Array.from(allAlbums.values())), 'utf-8')
        return pMap(allAlbums.values(), albumInfo => {
            return getAlbum(albumInfo.url)
                .then(result => {
                    if (result.tracks) {
                        fs.appendFileSync(outFile, printAlbum(result) + '\n\n\n', 'utf-8')
                    } else {
                        console.log(result)
                    }
                })
        }, { concurrency: albumConcurrency })
    })
