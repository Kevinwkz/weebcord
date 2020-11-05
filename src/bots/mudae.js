const settings = require('./mudae.json');
const reactions = settings.reactions;
const $ = require('../lib/jquery');

module.exports = (Connection, message, List, Notify) => {

    const localUser = Connection.Client.user;
    const sender = message.author;
    const senderName = sender.username;
    const embed = message.embeds[0];

    if ( sender.bot && embed && embed.type === 'rich' &&
        senderName.match(/Mudae|Muda(maid|butler)\s?\d*/)
    ) {

        const waifu = embed.author.name.split(' <')[0];

        // Unwanted waifus
        if (!(List.some(e => e.trim().toLowerCase() === waifu.trim().toLowerCase()))) return;

        /* Detect either character or kakera and react message if asked to */
        const Categories = {
            'waifu': async(reaction, activate) => {
                if (reactions.waifu.emojis.includes(reaction.emoji.name)) {
                    activate && await message.react(reaction.emoji.name);

                    return 1;
                }
            },
            'kakera': async(reaction, activate) => {
                const format = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
                if (reactions.kakera.emojis.some(r => r === format && r.includes('kakera'))) {
                    activate && await message.react(format);

                    return 1;
                }
            }
        };

        const CheckType = reaction => {
            let val;

            Object.keys(Categories).some(key => {
                if (Categories[key](reaction) && !val) {
                    val = key;
                    return 1;
                }
            });

            return val;
        };

        /* Collect Reactions */
        let filter = (reaction, user) => user.id === sender.id && CheckType(reaction);

        message.awaitReactions(filter, {
            max: 1,
            time: settings.timeout,
            errors: ['time']
        }).then(collected => {

            const reaction = collected.first();

            const key = CheckType(reaction);
            const data = reactions[key].data;
            Categories[key](reaction, 1);

            /* Wait Response */
            filter = response =>
                response.author.id === sender.id &&
                (
                    response.content.includes(waifu) ||
                    (
                        response.content.includes('interval') &&
                        response.content.includes(localUser.id)
                    )
                );

            message.channel.awaitMessages(filter, {
                max: 1,
                time: settings.timeout,
                errors: ['time']
            })
                .then(collected => {
                    const response = collected.first();
                    const gotMarried = response.content.includes(localUser.username);

                    CollectWaifu(gotMarried ? 0 : 1);
                })
                .catch(() => CollectWaifu(1));

            const CollectWaifu = miss => {
                const image = embed.image.proxyURL;
                const anime = embed.description.split('\n')[0];
                const claims = embed.description.match(/Claims:\s#(\d+)/);
                const likes = embed.description.match(/Likes:\s#(\d+)/);
                const kakera = embed.description.match(/\*\*(\d*)\*\*<:kakera:\d+>/);

                /* User Logs */
                const parentLog = `div.userLogs.${localUser.id}`;
                const log = $('.userLog:first').clone().insertBefore(`${parentLog} .userLog:first`);

                const allLogs = $(parentLog).children();

                // Limit
                if (allLogs.length > settings.logLimit + 1) allLogs.eq(allLogs.length - 2).remove();

                Log(data, log, miss);

                $(log).attr('id', '');
                $(log).css('margin-left', '200px');
                $(log).css('opacity', '0.3');

                $(log).find('.waifuName').html(waifu);
                $(log).find('.userLogWaifuImage').attr('src', image);
                $(log).find('.anime').html(anime);
                claims && $(log).find('.claims').html(`#${claims[1]}`);
                likes && $(log).find('.likes').html(`#${likes[1]}`);
                kakera && $(log).find('.kakera').html(kakera[1]);

                $(log).animate({
                    'margin-left': '7px',
                    opacity: '1'
                }, 'slow');

                // Desktop Notifications
                if (Notify && !miss)
                    Notify('Mudae Collector', data.notification.replace('{waifu}', waifu).replace('{kakera}', kakera[1]));

            };

        });

    }

};

const Log = (data, dom, key = 0) => {
    const domClass = '.waifuCollection';
    const event = data[Object.keys(data)[key]];

    $(dom).find(domClass).html(event.text);
    $(dom).find(domClass).addClass(event.dom);
};