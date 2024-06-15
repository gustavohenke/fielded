"use strict";(self.webpackChunk=self.webpackChunk||[]).push([[667],{2360:(e,r,a)=>{a.r(r),a.d(r,{assets:()=>o,contentTitle:()=>t,default:()=>h,frontMatter:()=>s,metadata:()=>l,toc:()=>d});var n=a(2540),i=a(3023);const s={toc_max_heading_level:4},t="Validation",l={id:"api/validation",title:"Validation",description:"This page has information about the validation-related APIs of fielded.",source:"@site/../docs/api/validation.mdx",sourceDirName:"api",slug:"/api/validation",permalink:"/fielded/api/validation",draft:!1,unlisted:!1,tags:[],version:"current",frontMatter:{toc_max_heading_level:4},sidebar:"sidebar",previous:{title:"FormArray",permalink:"/fielded/api/form-array"}},o={},d=[{value:"<code>Validation</code>",id:"validation-1",level:2},{value:"Properties",id:"properties",level:3},{value:"<code>.state</code>",id:"state",level:4},{value:"<code>.errors</code>",id:"errors",level:4},{value:"<code>.hasError</code>",id:"haserror",level:4},{value:"<code>.value</code>",id:"value",level:4},{value:"Methods",id:"methods",level:3},{value:"<code>.validate(value)</code>",id:"validatevalue",level:4},{value:"<code>ValidationError</code>",id:"validationerror",level:2},{value:"<code>constructor(message, opts)</code>",id:"constructormessage-opts",level:3},{value:"Static Methods",id:"static-methods",level:3},{value:"<code>.from(e)</code>",id:"frome",level:4},{value:"Properties",id:"properties-1",level:3},{value:"<code>.bail</code>",id:"bail",level:4}];function c(e){const r={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",h4:"h4",li:"li",p:"p",pre:"pre",ul:"ul",...(0,i.R)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(r.h1,{id:"validation",children:"Validation"}),"\n",(0,n.jsx)(r.p,{children:"This page has information about the validation-related APIs of fielded."}),"\n",(0,n.jsx)(r.h2,{id:"validation-1",children:(0,n.jsx)(r.code,{children:"Validation"})}),"\n",(0,n.jsxs)(r.p,{children:["A ",(0,n.jsx)(r.code,{children:"Validation"})," object represents the state of validation for a field."]}),"\n",(0,n.jsxs)(r.p,{children:[(0,n.jsx)(r.code,{children:"Validation"})," objects are automatically created from a ",(0,n.jsx)(r.a,{href:"/fielded/api/field#addvalidatorsvalidators",children:"field's validators"}),"\nwhen the field value is updated.\nThe validation state can be accessed through the ",(0,n.jsxs)(r.a,{href:"/fielded/api/field#validation",children:[(0,n.jsx)(r.code,{children:"Field.validation"})," property"]}),"."]}),"\n",(0,n.jsxs)(r.p,{children:["A validation calls its validators in sequence, stopping at the first one that throws an error\nor returns a promise that rejects. The error is converted using ",(0,n.jsx)(r.a,{href:"#frome",children:(0,n.jsx)(r.code,{children:"ValidationError.from()"})}),"."]}),"\n",(0,n.jsx)(r.pre,{children:(0,n.jsx)(r.code,{className:"language-ts",children:"const username = Field.text()\n  .addValidators(value => {\n    if (value.length < 3) {\n      throw new Error('Must have at least 3 characters');\n    }\n  }, value => {\n    if (reservedUsernames.includes(value)) {\n      throw new Error('Not available');\n    }\n  });\n\nusername.set('a');\nconsole.log(username.validation.errors); // ['Must have at least 3 characters']\n\nusername.set('some_reserved_name');\nconsole.log(username.validation.errors); // ['Not available']\n"})}),"\n",(0,n.jsxs)(r.p,{children:["If a validator throws a ",(0,n.jsx)(r.code,{children:"ValidationError"})," whose ",(0,n.jsxs)(r.a,{href:"#bail",children:[(0,n.jsx)(r.code,{children:"bail"})," property"]})," is set to ",(0,n.jsx)(r.code,{children:"false"}),",\nthen that validator ",(0,n.jsx)(r.em,{children:"will not"})," stop the validation, and the next validator runs normally."]}),"\n",(0,n.jsx)(r.pre,{children:(0,n.jsx)(r.code,{className:"language-ts",children:"const imageUrl = Field.text()\n  .addValidators(value => {\n    if (!value.startsWith('https')) {\n      throw new ValidationError('Must be an HTTPS URL', { bail: false });\n    }\n  }, value => {\n    if (!value.endsWith('.png')) {\n      throw new Error('Must be a PNG image');\n    }\n  });\n\nimageUrl.set('example.com/avatar.jpg');\nconsole.log(username.validation.errors); // ['Must be an HTTPS URL', 'Must be a PNG image']\n"})}),"\n",(0,n.jsx)(r.h3,{id:"properties",children:"Properties"}),"\n",(0,n.jsx)(r.h4,{id:"state",children:(0,n.jsx)(r.code,{children:".state"})}),"\n",(0,n.jsx)(r.p,{children:"The current state of the validation. Can be one of"}),"\n",(0,n.jsxs)(r.ul,{children:["\n",(0,n.jsxs)(r.li,{children:[(0,n.jsx)(r.code,{children:"pending"}),": if the validation is not complete yet;"]}),"\n",(0,n.jsxs)(r.li,{children:[(0,n.jsx)(r.code,{children:"valid"}),": if the validation is complete, and the value is valid;"]}),"\n",(0,n.jsxs)(r.li,{children:[(0,n.jsx)(r.code,{children:"invalid"}),": if the validation is completed, and there are errors."]}),"\n"]}),"\n",(0,n.jsx)(r.h4,{id:"errors",children:(0,n.jsx)(r.code,{children:".errors"})}),"\n",(0,n.jsxs)(r.p,{children:["An observable list of ",(0,n.jsx)(r.a,{href:"#validationerror",children:(0,n.jsx)(r.code,{children:"ValidationError"})}),"s for the last validated value."]}),"\n",(0,n.jsx)(r.h4,{id:"haserror",children:(0,n.jsx)(r.code,{children:".hasError"})}),"\n",(0,n.jsxs)(r.p,{children:["Whether there's any error in the validation state.\nShorthand for ",(0,n.jsx)(r.code,{children:"validation.errors.length > 0"}),"."]}),"\n",(0,n.jsx)(r.h4,{id:"value",children:(0,n.jsx)(r.code,{children:".value"})}),"\n",(0,n.jsxs)(r.p,{children:["The valid value of the field. Only set when ",(0,n.jsx)(r.a,{href:"#state",children:(0,n.jsx)(r.code,{children:"state"})})," is ",(0,n.jsx)(r.code,{children:"valid"}),"."]}),"\n",(0,n.jsx)(r.pre,{children:(0,n.jsx)(r.code,{className:"language-ts",children:"const age = Field.number().addValidators(value => {\n  if (value < 18) {\n    throw new Error('Must be an adult');\n  }\n});\n\nage.set(17);\nif (age.validation.state === 'valid') {\n  console.log(`Your age is ${age.validation.value}`);\n}\n"})}),"\n",(0,n.jsx)(r.h3,{id:"methods",children:"Methods"}),"\n",(0,n.jsx)(r.h4,{id:"validatevalue",children:(0,n.jsx)(r.code,{children:".validate(value)"})}),"\n",(0,n.jsx)(r.p,{children:"Triggers a validation on the passed value, and returns a promise for when the validation has finished."}),"\n",(0,n.jsx)(r.p,{children:"Manually calling this method will reset the validation state and rerun every validator."}),"\n",(0,n.jsx)(r.h2,{id:"validationerror",children:(0,n.jsx)(r.code,{children:"ValidationError"})}),"\n",(0,n.jsxs)(r.p,{children:["The ",(0,n.jsx)(r.code,{children:"ValidationError"})," represents an error thrown when a validator found a value to be invalid.\nIt can be manually instantiated by validators (by calling ",(0,n.jsx)(r.code,{children:"new ValidationError()"}),"), or mapped from\nany other value by using the static method ",(0,n.jsx)(r.code,{children:"ValidationError.from()"}),"."]}),"\n",(0,n.jsx)(r.h3,{id:"constructormessage-opts",children:(0,n.jsx)(r.code,{children:"constructor(message, opts)"})}),"\n",(0,n.jsxs)(r.p,{children:["Creates a new ",(0,n.jsx)(r.code,{children:"ValidationError"})," with the given message and options."]}),"\n",(0,n.jsxs)(r.p,{children:[(0,n.jsx)(r.code,{children:"opts"})," is an object which can have the following properties:"]}),"\n",(0,n.jsxs)(r.ul,{children:["\n",(0,n.jsxs)(r.li,{children:["\n",(0,n.jsxs)(r.p,{children:[(0,n.jsx)(r.code,{children:"bail"}),": See ",(0,n.jsx)(r.a,{href:"#bail",children:(0,n.jsx)(r.code,{children:"bail"})}),". Defaults to ",(0,n.jsx)(r.code,{children:"true"}),"."]}),"\n"]}),"\n",(0,n.jsxs)(r.li,{children:["\n",(0,n.jsxs)(r.p,{children:[(0,n.jsx)(r.code,{children:"cause"}),": the source error for the new validation error. You might want to set this when wrapping\nanother error.",(0,n.jsx)("br",{}),"\nFor example, if your validator throws some unexpected error, you might want to wrap it:"]}),"\n",(0,n.jsx)(r.pre,{children:(0,n.jsx)(r.code,{className:"language-ts",children:"const username = Field.text().addValidators(async value => {\n  const available = await service.isAvailable(value).catch(e => {\n    throw new ValidationError('Something went wrong', { cause: e });\n  });\n  if (!available) {\n    throw new Error('Not available');\n  }\n});\n"})}),"\n",(0,n.jsxs)(r.p,{children:["See ",(0,n.jsxs)(r.a,{href:"https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause",children:[(0,n.jsx)(r.code,{children:"Error: cause"})," on MDN"]})," for more information."]}),"\n"]}),"\n"]}),"\n",(0,n.jsx)(r.h3,{id:"static-methods",children:"Static Methods"}),"\n",(0,n.jsx)(r.h4,{id:"frome",children:(0,n.jsx)(r.code,{children:".from(e)"})}),"\n",(0,n.jsxs)(r.p,{children:["Converts any value to ",(0,n.jsx)(r.code,{children:"ValidationError"}),"."]}),"\n",(0,n.jsxs)(r.ul,{children:["\n",(0,n.jsxs)(r.li,{children:["If ",(0,n.jsx)(r.code,{children:"e"})," is an instance of ",(0,n.jsx)(r.code,{children:"ValidationError"}),", then it's returned."]}),"\n",(0,n.jsxs)(r.li,{children:["If ",(0,n.jsx)(r.code,{children:"e"})," is an instance of ",(0,n.jsx)(r.code,{children:"Error"}),", then the ",(0,n.jsx)(r.code,{children:"ValidationError"})," is created using that error's message.\nIt's also set as the cause of the validation error."]}),"\n",(0,n.jsxs)(r.li,{children:["Otherwise, ",(0,n.jsx)(r.code,{children:"e"})," is converted to a string and set as the error's message and cause."]}),"\n"]}),"\n",(0,n.jsx)(r.h3,{id:"properties-1",children:"Properties"}),"\n",(0,n.jsx)(r.h4,{id:"bail",children:(0,n.jsx)(r.code,{children:".bail"})}),"\n",(0,n.jsx)(r.p,{children:"Whether the validation should be stopped when hitting this error."})]})}function h(e={}){const{wrapper:r}={...(0,i.R)(),...e.components};return r?(0,n.jsx)(r,{...e,children:(0,n.jsx)(c,{...e})}):c(e)}},3023:(e,r,a)=>{a.d(r,{R:()=>t,x:()=>l});var n=a(3696);const i={},s=n.createContext(i);function t(e){const r=n.useContext(s);return n.useMemo((function(){return"function"==typeof e?e(r):{...r,...e}}),[r,e])}function l(e){let r;return r=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:t(e.components),n.createElement(s.Provider,{value:r},e.children)}}}]);