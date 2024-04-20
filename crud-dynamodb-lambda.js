import { DynamoDBClient, PutItemCommand, UpdateItemCommand, DeleteItemCommand, GetItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
const dynamodb = new DynamoDBClient({ apiVersion: "2012-08-10"});
const tableName = 'CourseTable';
export const handler = async (event) => {
  try {
    if (event.requestContext.http.method === 'POST') {
      return createItem(event);
    } else if (event.requestContext.http.method === 'GET') {
      // Check if it's a request for a single item (getItem)
      if (event.pathParameters && event.pathParameters.courseCode && event.pathParameters.teacherName) {
        return getItem(event.pathParameters.courseCode, event.pathParameters.teacherName);
      } if(event.queryStringParameters && event.queryStringParameters.year) {
        return scanItem(event);
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing path or query string params' })
        };
      }
    } else if (event.requestContext.http.method === 'PUT') {
      return updateItem(event);
    } else if (event.requestContext.http.method === 'DELETE') {
      if(event.pathParameters && event.pathParameters.courseCode && event.pathParameters.teacherName) {
        return deleteItem(event.pathParameters.courseCode, event.pathParameters.teacherName);
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing path params' })
        };
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported HTTP method ' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message + JSON.stringify(event) })
    };
  }
};

const createItem = async(event) => {
  try {
    const { courseCode, teacherName, courseName, month, year, students } = (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);
    const params = {
      TableName: tableName,
      Item: {
        "courseCode": { S: courseCode },
        "teacherName": { S: teacherName },
        "courseName": { S: courseName },
        "month": { N: month.toString() },
        "year": { N: year.toString() },
        "students": { SS: students }
      }
    };
        
    const command = new PutItemCommand(params);
    await dynamodb.send(command);
        
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Course added successfully' })
    };    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message + JSON.stringify(event)})
    };
  }
}

const updateItem = async (event) => {
  const { courseCode, teacherName, courseName, month, year, students } = (typeof event.body === 'string' ? JSON.parse(event.body) : event.body);
  try {
    const params = {
      TableName: tableName,
      Key: {
        "courseCode": { S: courseCode },
        "teacherName": { S: teacherName }
      },
      UpdateExpression: "SET #mn = :month, #yr = :year, students = :students",
      ExpressionAttributeValues: {
        ":month": { N: month.toString() },
        ":year": { N: year.toString() },
        ":students": { SS: students }
      },
      ExpressionAttributeNames: {
        "#mn": "month",
        "#yr": "year"
      },
      ReturnValues: "ALL_NEW"
    };
        
    const command = new UpdateItemCommand(params);
    const { Attributes } = await dynamodb.send(command);
        
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Course updated successfully', updatedAttributes: Attributes })
    };    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

const scanItem = async (event) => {
  try {
    let year;
    if(event.queryStringParameters && event.queryStringParameters.year) {
      year = event.queryStringParameters.year;
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Year query parameter is missing' })
      };
    }

    const params = {
      TableName: tableName, 
      FilterExpression: "#yr = :year",
      ExpressionAttributeNames: {
        "#yr": "year"
      },
      ExpressionAttributeValues: {
        ":year": { N: year.toString() }
      }
    };

    const command = new ScanCommand(params);
    const { Items } = await dynamodb.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ items: Items })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

const getItem = async(courseCode, teacherName) => {
  try {
    const params = {
      TableName: tableName,
      Key: {
        "courseCode": { S: courseCode },
        "teacherName": {S: teacherName }
      }
    };

    const command = new GetItemCommand(params);

    const { Item } = await dynamodb.send(command);

    if (Item) {
      return {
        statusCode: 200,
        body: JSON.stringify(Item)
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Item not found' })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

const deleteItem = async(courseCode, teacherName) => {
  try {
    const params = {
      TableName: tableName,
      Key: {
        "courseCode": { S: courseCode },
        "teacherName": {S: teacherName }
      }
    };

    const command = new DeleteItemCommand(params);

    await dynamodb.send(command);

    return {
      statusCode: 20, 
      body: JSON.stringify({ message: 'Course deleted successfully'})
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
