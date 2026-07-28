import Razorpay from 'razorpay';

const rzp = new Razorpay({ key_id: 'rzp_test_123', key_secret: 'secret' });
const apiPrototype = Object.getPrototypeOf(rzp.api);

const originalGet = apiPrototype.get;
apiPrototype.get = function (params, cb) {
  console.log('GET CALLED WITH:', params);
  const promise = Promise.resolve({
    id: 'pay_XYZ',
    status: 'captured',
    refund_status: null,
  });
  if (typeof cb === 'function') {
    promise.then(
      (res) => cb(null, res),
      (err) => cb(err)
    );
  }
  return promise;
};

async function test() {
  const payment = await rzp.payments.fetch('pay_XYZ');
  console.log('Fetched Payment:', payment);
}

test()
  .catch(console.error)
  .finally(() => {
    apiPrototype.get = originalGet;
  });
