const QARK = artifacts.require('QARK');
const utils = require('./utils');

contract('QARK', async accounts => {

    const acc = utils.acc(accounts);

    // INITIALIZATION

    it('should create contract with 333 333 000 QARK supply', async () => {
        const instance = await QARK.deployed();
        let balance = await instance.balanceOf(acc.owner);
        let totalSupply = await instance.totalSupply();
        assert.equal(totalSupply.toString(), utils.eth('333333000'));
        assert.equal(balance.toString(), '0');
    });

    it('should initialize privSeller with 133 333 200 QARK balance', async () => {
        const instance = await QARK.deployed();
        await instance.setRoleAddress(0, acc.seller.priv);
        let balance = await instance.balanceOf(acc.seller.priv);
        assert.equal(balance.toString(), utils.eth('133333200'));
    });

    it('should initialize management with 44 44 400 QARK balance', async () => {
        const instance = await QARK.deployed();
        await instance.setRoleAddress(2, acc.management);
        let balance = await instance.balanceOf(acc.management);
        let frozen = await instance.frozenBalanceOf(acc.management);
        assert.equal(frozen.toString(), utils.eth('44444400'));
        assert.equal(balance.toString(), utils.eth('44444400'));
    });

    it('should initialize centrum with 44 44 400 QARK balance', async () => {
        const instance = await QARK.deployed();
        await instance.setRoleAddress(3, acc.centrum);
        let balance = await instance.balanceOf(acc.centrum);
        assert.equal(balance.toString(), utils.eth('44444400'));
    });

    it('should initialize reserve with 22 22 200 QARK balance', async () => {
        const instance = await QARK.deployed();
        await instance.setRoleAddress(4, acc.reserve);
        let balance = await instance.balanceOf(acc.reserve);
        let frozen = await instance.frozenBalanceOf(acc.reserve);
        assert.equal(frozen.toString(), utils.eth('22222200'));
        assert.equal(balance.toString(), utils.eth('22222200'));
    });

    it('should set rateUpdater with 0 QARK balance', async () => {
        const instance = await QARK.deployed();
        await instance.setRoleAddress(5, acc.rateUpdater);
        let balance = await instance.balanceOf(acc.rateUpdater);
        assert.equal(balance.toString(), utils.eth('0'));
    });

    it('should not transfer from frozen mgmt', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.management,
            to: acc.random('frozenManagementToRandom'),
            amount: '1000',
            total: '0',
            unlocked: '0',
            expectError: 'Frozen balance can not be spent yet, insufficient tokens!'
        }));
    });

    it('should not transfer from frozen reserve', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.reserve,
            to: acc.random('frozenReserveToRandom'),
            amount: '1000',
            total: '0',
            unlocked: '0',
            expectError: 'Frozen balance can not be spent yet, insufficient tokens!'
        }));
    });

    it('should set public sale period', async () => {
        const instance = await QARK.deployed();
        const pubSaleStart = Math.floor(+ new Date() / 1000) - 60; //OFFICIAL START DATE
        const pubSaleEnd = pubSaleStart + 265;
        const restrictionEnd = pubSaleEnd + 65;

        console.log('TIMING ::', pubSaleStart, pubSaleEnd, restrictionEnd);

        //FROM NOW UNTIL THE OFFICIAL CLOSE TIME
        await instance.setTiming(pubSaleStart, pubSaleEnd, restrictionEnd);

        assert.equal(await instance.pubSaleStart(), pubSaleStart);
        assert.equal(await instance.pubSaleEnd(), pubSaleEnd);
        assert.equal(await instance.restrictionEnd(), restrictionEnd);
    });

    it('should initialize exchange with 88 88 800 QARK balance', async () => {
        const instance = await QARK.deployed();
        await instance.setRoleAddress(1, acc.seller.exchange.hot);
        let balance = await instance.balanceOf(acc.seller.exchange.hot);
        assert.equal(balance.toString(), utils.eth('88888800'));
    });

    it('should immediately forward 88 88 800 QARK from Exchange', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.hot,
            to: acc.seller.exchange.cold,
            amount: '88888800',
            total: '88888800',
            locked: '0'
        }));
    });

    it('should have mapped all roles to proper addresses', async () => {
        const instance = await QARK.deployed();
        const roleMap = {
            0: acc.seller.priv,
            1: acc.seller.exchange.hot,
            2: acc.management,
            3: acc.centrum,
            4: acc.reserve
        }
        let roleAddr;
        for (var i = 0; i < Object.keys(roleMap).length; i++) {
            roleAddr = await instance.getRoleAddress(i);
            assert.equal(roleAddr.toString(), roleMap[i]);
        }
    });

    it('should not change exchange address', async () => {
        const instance = await QARK.deployed();
        const expectedError = 'Exchange address MUST not be updated!';
        let actualError;
        try {
            await instance.setRoleAddress(1, acc.random('maliciousExchangeReset'));
        } catch (e) {
            if(e && e.reason){
                actualError = e.reason;
            }
        }
        let balance = await instance.balanceOf(acc.random('maliciousExchangeReset'));
        assert.equal(actualError, expectedError);
        assert.equal(balance.toString(), '0');
    });

    it('should sell 1 000 QARK from centrum', async () => {
        const instance = await QARK.deployed();

        assert(await utils.transferTest(instance, {
            from: acc.centrum,
            to: acc.random('initialCentrumBuyer'),
            amount: '1000',
            total: '1000',
            locked: '0'
        }));
    });

    it('should sell 2 000 000 QARK as private sale', async () => {
        const instance = await QARK.deployed();

        assert(await utils.transferTest(instance, {
            from: acc.seller.priv,
            to: acc.buyer.priv,
            amount: '2000000',
            total: '2000000',
            locked: '2000000'
        }));
    });

    it('should sell 1 000 000 QARK as private sale', async () => {
        const instance = await QARK.deployed();

        assert(await utils.transferTest(instance, {
            from: acc.seller.priv,
            to: acc.random('dummyPrivateBuyerAddress'),
            amount: '1000000',
            total: '1000000',
            locked: '1000000'
        }));
    });

    it('should sell 88 800 QARK from Exchange to IEO buyer', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.random('someIeoBuyer'),
            amount: '88800',
            total: '88800',
            locked: '0'
        }));
    });

    it('should sell 800 000 QARK from Exchange to privBuyer', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.buyer.priv,
            amount: '800000',
            total: '2800000',
            locked: '2000000'
        }));
    });

    it('should not let privBuyer transfer locked balance during public sale', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.buyer.priv,
            to: acc.random('lockedTokenTransferDuringIEO'),
            amount: '1000000',
            expectError: 'Not enough unlocked tokens!'
        }));
    });

    it('should let privBuyer transfer unlocked balance during public sale', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.buyer.priv,
            to: acc.random('unlockedTokenTransferDuringIEO'),
            amount: '800000',
            total: '800000',
            locked: '0'
        }));
    });

    it('should not let privBuyer transfer locked balance during public sale', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.buyer.priv,
            to: acc.random('unlockedTokenTransferDuringIEO'),
            amount: '100000',
            total: '0',
            locked: '0',
            expectError: 'Not enough unlocked tokens!'
        }));
    });

    it('should transfer 50000 QARK from ieoBuyer to privBuyer', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.buyer.priv,
            amount: '50000',
            total: '2050000',
            locked: '2000000'
        }));
    });

    it('should let ieo buyer to transfer during public sale', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.random('someRecipient'),
            amount: '30000', //1500 would be OK!
            total: '30000',
            locked: '0'
        }));
    });

    it('should close public sale', async () => {
        const instance = await QARK.deployed();
        const pubSaleEnd = await instance.pubSaleEnd();
        while(parseInt(pubSaleEnd.toString()) >= Math.floor(+ new Date() / 1000)){
            console.log(parseInt(pubSaleEnd.toString()) - Math.floor(+ new Date() / 1000), 'remaining...');
            await utils.timeout(1000);
        }
        assert(parseInt(pubSaleEnd.toString()) < Math.floor(+ new Date() / 1000));
    });

    it('should update QARK/USD conversion rate after public sale', async () => {
        const instance = await QARK.deployed();

        //35 Cents = 0,35 USD
        const targetRate = 35;

        await instance.setRate(targetRate, { from: acc.rateUpdater });
        assert.equal(await instance.conversionRate(), targetRate);
    });

    it('should not transfer locked balance from private buyer to random buyer', async () => {
        const instance = await QARK.deployed();

        assert(await utils.transferTest(instance, {
            from: acc.buyer.priv,
            to: acc.random('privateSellerAndRateLow'),
            amount: '50001',
            expectError: 'Private token trading halted because of low market prices!'
        }));
    });

    it('should transfer unlocked balance from private buyer to random buyer', async () => {
        const instance = await QARK.deployed();

        assert(await utils.transferTest(instance, {
            from: acc.buyer.priv,
            to: acc.random('privateSellerAndRateLow'),
            amount: '50000',
            total: '50000',
            locked: '0'
        }));
    });

    it('should let ieo buyer to transfer 3 800 QARK after public sale', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.buyer.priv,
            amount: '3800',
            total: '2003800',
            locked: '2000000'
        }));
    });

    it('should update QARK/USD conversion rate after public sale', async () => {
        const instance = await QARK.deployed();
        const targetRate = 40;

        await instance.setRate(targetRate, { from: acc.rateUpdater });
        assert.equal(await instance.conversionRate(), targetRate);
    });

    it('should let privBuyer transfer full balance w/o restrictions', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.buyer.priv,
            to: acc.buyer.postpub,
            amount: '2003800',
            total: '2003800',
            locked: '2000000'
        }));
    });

    it('should update QARK/USD conversion rate to low price', async () => {
        const instance = await QARK.deployed();
        const targetRate = 30;

        await instance.setRate(targetRate, { from: acc.rateUpdater });
        assert.equal(await instance.conversionRate(), targetRate);
    });

    it('should not let postPub buyer transfer locked balance to random addr', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.buyer.postpub,
            to: acc.random('shouldNotBeAllowed'),
            amount: '2003800',
            expectError: 'Private token trading halted because of low market prices!'
        }));
    });

    it('should let postPub buyer transfer locked balance back to privBuyer', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.buyer.postpub,
            to: acc.buyer.priv,
            amount: '2003800',
            total: '2003800',
            locked: '2000000'
        }));
    });


    it('should close restrictions period', async () => {
        const instance = await QARK.deployed();
        const restrictionEnd = await instance.restrictionEnd();
        while(parseInt(restrictionEnd.toString()) >= Math.floor(+ new Date() / 1000)){
            console.log(parseInt(restrictionEnd.toString()) - Math.floor(+ new Date() / 1000), 'remaining...');
            await utils.timeout(1000);
        }
        assert(parseInt(restrictionEnd.toString()) < Math.floor(+ new Date() / 1000));
    });

    it('should not claim reserve early', async () => {
        const instance = await QARK.deployed();
        const expectedError = 'Reserve can not be claimed before end of public sale!';
        let actualError;

        try {
            await instance.claimReserve({ from: acc.reserve });
        } catch (e) {
            actualError = e.reason;
        }
        assert.equal(actualError, expectedError);
    });
/*
    it('should enable reserve claim', async () => {
        const instance = await QARK.deployed();
        const pubSaleStart = (Math.floor(+ new Date() / 1000)) - (60 * 60 * 24 * 14); //PUBSALE STARTED 14 DAYS AGO
        const pubSaleEnd = Math.floor(+ new Date() / 1000) - (60 * 60 * 24 * 8); //PUBSALE ENDED 8 DAYS AGO
        const restrictionEnd = pubSaleEnd + 1; //RESTRICTIONS ENDED 1 SECOND AFTER

        await instance.setTiming(pubSaleStart, pubSaleEnd, restrictionEnd);

        assert.equal(await instance.pubSaleStart(), pubSaleStart);
        assert.equal(await instance.pubSaleEnd(), pubSaleEnd);
        assert.equal(await instance.restrictionEnd(), restrictionEnd);
    });

    it('should claim reserve from private seller', async () => {
        const instance = await QARK.deployed();

        //RECORD BALANCES PRIOR CLAIMING RESERVE
        const preBalances = {
            privseller: await instance.balanceOf(acc.seller.priv),
            reserve: await instance.balanceOf(acc.reserve)
        };

        //MAKE ACTUAL CLAIM
        await instance.claimReserve({ from: acc.reserve });

        //RECORD BALANCES AFTER CLAIM
        const postBalances = {
            privseller: await instance.balanceOf(acc.seller.priv),
            reserve: await instance.balanceOf(acc.reserve)
        };

        //MAKE ASSERTIONS
        assert.equal(postBalances.privseller.toString(), '0');
        assert.equal(
            postBalances.reserve.toString(),
            preBalances.reserve
                .add(preBalances.privseller)
                .toString()
            );
    });
*/
    it('should freeze tokens of IEO buyer for 5 seconds', async () => {
        const instance = await QARK.deployed();
        const fiveSecondsLater = Math.floor(+new Date() / 1000) + 5;

        const preBalance = await instance.balanceOf(acc.seller.exchange.cold);

        await instance.freezeOwnTokens(utils.eth('3000'), fiveSecondsLater, {from: acc.seller.exchange.cold});

        const balance = await instance.balanceOf(acc.seller.exchange.cold);
        const frozenBalance = await instance.frozenBalanceOf(acc.seller.exchange.cold);
        const frozenTiming = await instance.frozenTimingOf(acc.seller.exchange.cold);

        assert.equal(preBalance.toString(), balance.toString());
        assert.equal(frozenBalance.toString(), utils.eth('3000'));
        assert.equal(frozenTiming.toString(), fiveSecondsLater);
    });

    it('should not let tranfer frozen tokens', async () => {
        const instance = await QARK.deployed();

        const balance = await instance.balanceOf(acc.seller.exchange.cold);
        const frozenBalance = await instance.frozenBalanceOf(acc.seller.exchange.cold);
        const nonFrozen = balance.sub(frozenBalance).toString();
        const transferable = parseInt(nonFrozen.substring(0, nonFrozen.length - 18));

        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.random('frozenTransferTest'),
            amount: (transferable + 1).toString(),
            expectError: 'Frozen balance can not be spent yet, insufficient tokens!'
        }));
    });

    it('should let tranfer non-frozen tokens', async () => {
        const instance = await QARK.deployed();

        const balance = await instance.balanceOf(acc.seller.exchange.cold);
        const frozenBalance = await instance.frozenBalanceOf(acc.seller.exchange.cold);
        const nonFrozen = balance.sub(frozenBalance).toString();
        const transferable = parseInt(nonFrozen.substring(0, nonFrozen.length - 18));

        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.random('nonFrozenTransferTest'),
            amount: transferable.toString(),
            total: transferable.toString(),
            locked: '0'
        }));
    });

    it('should not let tranfer frozen tokens #2', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.random('frozenTransferTest'),
            amount: '1',
            expectError: 'Frozen balance can not be spent yet, insufficient tokens!'
        }));
    });

    it('should let tranfer frozen tokens after frozenTime is over', async () => {
        const instance = await QARK.deployed();
        assert(await utils.transferTest(instance, {
            from: acc.seller.exchange.cold,
            to: acc.random('frozenTransferTest'),
            amount: '3000',
            delay: 6000,
            total: '3000',
            locked: '0'
        }));
    });

    it('should not change role to positive balance address', async () => {
        const instance = await QARK.deployed();
        const expectedError = 'Only zero balance addresses can be assigned!';
        let actualError;
        try {
            await instance.setRoleAddress(2, acc.random('frozenTransferTest'));
        } catch (e) {
            if(e && e.reason){
                actualError = e.reason;
            }
        }
        assert.equal(actualError, expectedError);
    });

    it('should change any role to zero balance address', async () => {
        const instance = await QARK.deployed();

        for (var i = 0; i <= 5; i++) {

            //SKIP EXCHANGE ADDRESS
            if(i !== 1){

                const preRoleAddress = await instance.getRoleAddress(i);
                const preBalance = await instance.balanceOf(preRoleAddress.toString());
                const preLockedBalance = await instance.lockedBalanceOf(preRoleAddress.toString());
                const preFrozenBalance = await instance.frozenBalanceOf(preRoleAddress.toString());

                await instance.setRoleAddress(i, acc.random('zeroBalanceForRoleChange' + i));

                const postRoleAddress = await instance.getRoleAddress(i);
                const postBalance = await instance.balanceOf(postRoleAddress.toString());
                const postLockedBalance = await instance.lockedBalanceOf(postRoleAddress.toString());
                const postFrozenBalance = await instance.frozenBalanceOf(postRoleAddress.toString());

                assert.equal(postRoleAddress.toString(), acc.random('zeroBalanceForRoleChange' + i));
                assert.equal(preBalance.toString(), postBalance.toString());
                assert.equal(preLockedBalance.toString(), postLockedBalance.toString());
                assert.equal(preFrozenBalance.toString(), postFrozenBalance.toString());
            }
        }
    });
});
