const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
(async()=>{
  try{
    const tenant=await prisma.tenant.create({data:{name:'demo-tenant'}});
    const wf=await prisma.workflow.create({data:{name:'demo-workflow',tenantId:tenant.id}});
    const definition={
      steps:[
        {id:'A',type:'delay',next:['B'],config:{durationMs:500}},
        {id:'B',type:'http',next:[],config:{url:'https://httpbin.org/get',method:'GET'}}
      ]
    };
    await prisma.workflowVersion.create({data:{workflowId:wf.id,version:1,definition:definition}});
    console.log('WORKFLOW_ID:'+wf.id);
  }catch(e){console.error(e);process.exit(1)}finally{await prisma.$disconnect()}
})();
