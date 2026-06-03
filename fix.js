const fs = require('fs');
['js/modules/projectile.js', 'js/modules/dynamics.js', 'js/modules/electrostatics.js'].forEach(f => {
    let c = fs.readFileSync(f, 'utf8');
    c = c.replace(/\\`/g, '`');
    fs.writeFileSync(f, c);
    console.log(f + ' fixed');
});
