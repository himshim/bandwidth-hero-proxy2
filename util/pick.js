// Since only single function required from lodash or underscore, writing it self

module.exports=(r,e)=>{let l={};for(let t in r||(r={}),Array.isArray(e)||(e=[e]),r)Object.hasOwnProperty.call(r,t)&&e.includes(t)&&(l[t]=r[t]);return l};
