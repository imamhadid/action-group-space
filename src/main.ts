import { endGroup, startGroup } from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import { formatEvent } from './format'
import { getInputs, Inputs, statusOpts } from './input'
import { logDebug, logError, logInfo } from './utils'
import { fitContent, fitEmbed } from './validate'

async function run() {
    try {
        logInfo('Getting inputs...')
        const inputs = getInputs()

        logInfo('Generating payload...')
        const payload = getPayload(inputs)
        startGroup('Dump payload')
        logInfo(JSON.stringify(payload, null, 2))
        endGroup()

        logInfo(`Triggering ${inputs.webhooks.length} webhook${inputs.webhooks.length > 1 ? 's' : ''}...`)
        await Promise.all(inputs.webhooks.map(w => wrapWebhook(w.trim(), payload, inputs.token)))
    } catch (e: any) {
        logError(`Unexpected failure: ${e} (${e.message})`)
    }
}

function wrapWebhook(webhook: string, payload: Object, token: string): Promise<void> {
    return async function () {
        try {
            await axios.post(webhook, payload, { headers: { Authorization: `Bearer ${token}` } })
            logInfo(`webhook: ${webhook}`)
            logInfo(`payload: ${payload}`)
            logInfo(`token: ${token}`)
        } catch (e: any) {
            if (e.response) {
                logError(`Webhook response: ${e.response.status}: ${JSON.stringify(e.response.data)}`)
            } else {
                logError(e)
            }
        }
    }()
}

export function getPayload(inputs: Readonly<Inputs>): Object {
    const ctx = github.context
    const { owner, repo } = ctx.repo
    const { eventName, ref, workflow, actor, payload, serverUrl, runId } = ctx
    const repoURL = `${serverUrl}/${owner}/${repo}`
    const workflowURL = `${repoURL}/actions/runs/${runId}`

    logDebug(JSON.stringify(payload))

    const eventFieldTitle = `Event - ${eventName}`
    const eventDetail = formatEvent(eventName, payload)

    let embed: { [key: string]: any } = {
        color: inputs.color || statusOpts[inputs.status].color
    }

    if (!inputs.notimestamp) {
        embed.timestamp = (new Date()).toISOString()
    }

    if (inputs.channel_id) {
        embed.channel = `channel:id:${inputs.channel_id}`
    }

    // title
    // if (inputs.title) {
    // }

    // if (inputs.url) {
    //     embed.url = inputs.url
    // }

    // if (inputs.image) {
    //     embed.image = {
    //         url: inputs.image
    //     }
    // }

    // if (!inputs.noprefix) {
    //     embed.title = statusOpts[inputs.status].status + (embed.title ? `: ${embed.title}` : '')
    // }

    // if (inputs.description) {
    //     embed.description = inputs.description
    // }

    if (!inputs.nocontext) {

        embed.content = {
            "className": "ChatMessage.Block",
            "style": "PRIMARY",
            "outline": {
                "className": "MessageOutline",
                "icon": {
                    "icon": "automation"
                },
                "text": inputs.username
            },
            "sections": [
                {
                    "className": "MessageSection",
                    "elements": [
                        {
                            "className": "MessageText",
                            "accessory": {
                                "className": "MessageIcon",
                                "icon": {
                                    "icon": "animals-category"
                                },
                                "style": "SUCCESS"
                            },
                            "style": "SECONDARY",
                            "size": "LARGE",
                            "content": statusOpts[inputs.status].status + (embed.title ? `: ${embed.title}` : '')
                        }
                    ]
                },
                {
                    "className": "MessageSection",
                    "elements": [
                        {
                            "className": "MessageDivider"
                        },
                        {
                            "className": "MessageText",
                            "accessory": {
                                "className": "MessageImage",
                                "src": inputs.image === undefined ? "https://www.static-src.com/wcsstore/Indraprastha/images/catalog/medium//101/MTA-27439328/oem_kacamata_kucing_trendy_full01_plld825p.jpg" : inputs.image
                            },
                            "style": "PRIMARY",
                            "size": "REGULAR",
                            "content": inputs.description
                        },
                        {
                            "className": "MessageFields",
                            "fields": [
                                {
                                    "className": "MessageField",
                                    "first": "Repository",
                                    "second": `[${owner}/${repo}](${repoURL})`
                                },
                                {
                                    "className": "MessageField",
                                    "first": "Ref",
                                    "second": ref
                                },
                                {
                                    "className": "MessageField",
                                    "first": eventFieldTitle,
                                    "second": eventDetail
                                },
                                {
                                    "className": "MessageField",
                                    "first": 'Triggered by',
                                    "second": actor
                                },
                                {
                                    "className": "MessageField",
                                    "first": "Workflow",
                                    "second": `[${workflow}](${workflowURL})`
                                }
                            ]
                        }
                    ],
                    "footer": (new Date()).toISOString(),
                    "textSize": "REGULAR"
                }
            ]
        }
    }

    let discord_payload: any = embed
    // logDebug(`embed: ${JSON.stringify(embed)}`)

    // if (inputs.content) {
    //     discord_payload.content = fitContent(inputs.content)
    // }

    return discord_payload
}

run()