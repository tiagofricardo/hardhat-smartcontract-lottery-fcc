const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30")
const { verify } = require("../utils/verify")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chaindId = network.config.chaindId
    let vrfcoordinatorV2Address, subscriptionId, VRFCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfcoordinatorV2Address = VRFCoordinatorV2Mock.address
        const transactionResponse = await VRFCoordinatorV2Mock.createSubscription()
        const transactionReceipt = await transactionResponse.wait(1)
        subscriptionId = transactionReceipt.events[0].args.subId
        await VRFCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfcoordinatorV2Address = networkConfig[chaindId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chaindId]["subscriptionId"]
    }

    const entranceFee = networkConfig[chaindId]["entranceFee"]
    const gasLane = networkConfig[chaindId]["gasLane"]
    const callbackGasLimit = networkConfig[chaindId]["callbackGasLimit"]
    const interval = networkConfig[chaindId]["interval"]

    const args = [
        vrfcoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ]

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(raffle.address, args)
    }
    if (developmentChains.includes(network.name)) {
        await VRFCoordinatorV2Mock.addConsumer(subscriptionId.toNumber(), raffle.address)
    }
    log("---------------------------------------------")
}

module.exports.tags = ["all", "raffle"]
