const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

const calculateFee = (transactionAmount) => {
    const amount = BigInt(transactionAmount)
    const rawFee = Number((amount + 999n) / 1000n)
    return clamp(rawFee, 10, 1000)
}

module.exports = {
    calculateFee
}
