const fs = require('fs')
const { promisify } = require('util')

const bandcamp = require('bandcamp-scraper')
const pMap = require('p-map');


const outFile = './out.data'

// Concurrency does not seem to work currently
const tagsConcurrency = 1
const albumConcurrency = 1

const tags = [
    'vaporwave',
    'vaporambient',
    'vapornoise',
    'vaportrap',
    'post-vaporwave',
    'nuwrld',
    'internet',
    'post-internet',
    'plunderphonics',
    'nu disco',
    'mallsoft',
    'virtual reality',
    'dream music'
]



const getAlbum = promisify(bandcamp.getAlbumInfo)

const getAlbumsWithTag = (tag, allAlbums) =>
    new Promise(resolve =>
        (function loop(page) {
            bandcamp.tag({ tag, page }, (error, searchResults) => {
                if (error) {
                    console.error(error)
                    resolve(allAlbums)
                } else if (searchResults.length === 0) {
                    resolve(allAlbums)
                } else {
                    for (const album of searchResults) {
                        allAlbums.set(album.name, album)
                    }
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


fs.writeFileSync(outFile, '')

const allAlbums = new Map()

pMap(tags, tag => {
    return getAlbumsWithTag(tag, allAlbums)
}, { concurrency: tagsConcurrency })
    .then(() => {
        return pMap(allAlbums.values(), albumInfo => {
            console.log(albumInfo.url)
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

