import './app';

if (module.hot) {
    module.hot.accept('./app', function() {
        console.log('Hot module replacement for ./app');
        const newApp = require('./app');
    });

    module.hot.accept(function(err) {
        console.error('Cannot apply HMR update.', err);
        window.location.reload();
    });
}
