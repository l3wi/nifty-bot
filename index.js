require('dotenv').config()
const Discord = require('discord.js')
const fetch = require('isomorphic-fetch')

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}


const fetchFeed = async () => {
    const response = await fetch(process.env.ENDPOINT + '/market/all-data/', {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer ReX9zGsQjsTNqA8CNZmWrRJZAwLckL'
        },
        body: JSON.stringify({current: 1, size: 30, cancelToken: {promise: {}}, timeout: 10000}) // body data type must match "Content-Type" header
    });
    const data = await response.json()
    return data.data.results
}

const fetchStats = async (type, contract) => {
    const response = await fetch(process.env.ENDPOINT + "/market/summary-stats/", {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer ReX9zGsQjsTNqA8CNZmWrRJZAwLckL'
        },
        body: JSON.stringify({ niftyType: type,contractAddress: contract, promise: {}, cancelToken: {promise: {}}, timeout: 10000})
    });
    const data = await response.json()
    return data
}

let buffer = []

const client = new Discord.Client()

client.on('ready', async function () {
    /// First load:
    buffer = await fetchFeed()

    setInterval(async () => {
        // console.log('Fetching Data')
        const rawData = await fetchFeed()
        const oldData = JSON.parse(JSON.stringify(buffer))
        buffer = rawData

        const newData = rawData.filter((v,i)=> !oldData.some(t=>(t.Timestamp === v.Timestamp)))
        // console.log("Filtered Data", newData)
        if (newData.length === 0) return

        const stats = await Promise.all(newData.filter(item => item.Type === 'sale').map(async item => fetchStats(item.NiftyObject.unmintedNiftyObjThatCreatedThis.niftyType, item.NiftyObject.contractAddress)))
        newData.filter(item => item.Type === 'sale').map(async (item, i) => {

            const embed = new Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle(`${item.Type.toUpperCase()}: ${item.NiftyObject.name}`)
                .setURL(`https://niftygateway.com/itemdetail/secondary/${item.NiftyObject.contractAddress}/${item.NiftyObject.tokenId}`)
                .setAuthor(item.NiftyObject.project_name)
                .setDescription(item.NiftyObject.description)
                .setThumbnail('https://res.cloudinary.com/nifty-gateway/image/upload/q_auto:good,w_500/v1576344316/nifty-builder-images/kyhclu5quebqm4sit0he.png')
                .setTimestamp()
                .addFields(
                    { name: 'Sale price', value: `$${numberWithCommas((item.SaleAmountInCents/100).toFixed(2))}`, inline: true },
                    { name: 'Avg resale', value: `$${numberWithCommas((stats[i].average_secondary_market_sale_price_in_cents/100).toFixed(2))}`, inline: true },
                    { name: 'Highest bid', value: `$${numberWithCommas((stats[i].highest_bid_in_cents/100).toFixed(2))}`, inline: true },
                )
            client.channels.cache.get(process.env.CHANNEL).send({ embed: embed })
        })
    }, 10000)
})

client.login(process.env.TOKEN)
